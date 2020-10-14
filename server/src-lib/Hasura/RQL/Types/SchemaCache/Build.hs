{-# LANGUAGE Arrows #-}

-- | Types and functions used in the process of building the schema cache from metadata information
-- stored in the @hdb_catalog@ schema in Postgres.
module Hasura.RQL.Types.SchemaCache.Build
  ( CollectedInfo(..)
  , partitionCollectedInfo

  , recordInconsistency
  , recordInconsistencies
  , recordDependencies
  , withRecordInconsistency

  , CacheRWM(..)
  , ResolvedSources
  , BuildContext(..)
  , BuildReason(..)
  , getResolvedSourceFromBuildContext
  , CacheInvalidations(..)
  , buildSchemaCache
  , buildSchemaCacheFor
  , buildSchemaCacheStrict
  , withNewInconsistentObjsCheck
  ) where

import           Hasura.Prelude

import qualified Data.HashMap.Strict.Extended  as M
import qualified Data.Sequence                 as Seq
import qualified Data.Text                     as T

import           Control.Arrow.Extended
import           Control.Lens
import           Data.Aeson                    (toJSON)
import           Data.Aeson.Casing
import           Data.Aeson.TH
import           Data.List                     (nub)

import           Hasura.RQL.Types.Error
import           Hasura.RQL.Types.Metadata
import           Hasura.RQL.Types.RemoteSchema (RemoteSchemaName)
import           Hasura.RQL.Types.SchemaCache
import           Hasura.RQL.Types.Source
import           Hasura.Tracing                (TraceT)

-- ----------------------------------------------------------------------------
-- types used during schema cache construction

data CollectedInfo
  = CIInconsistency !InconsistentMetadata
  | CIDependency
    !MetadataObject -- ^ for error reporting on missing dependencies
    !SchemaObjId
    !SchemaDependency
  deriving (Show, Eq)
$(makePrisms ''CollectedInfo)

class AsInconsistentMetadata s where
  _InconsistentMetadata :: Prism' s InconsistentMetadata
instance AsInconsistentMetadata InconsistentMetadata where
  _InconsistentMetadata = id
instance AsInconsistentMetadata CollectedInfo where
  _InconsistentMetadata = _CIInconsistency

partitionCollectedInfo
  :: Seq CollectedInfo
  -> ([InconsistentMetadata], [(MetadataObject, SchemaObjId, SchemaDependency)])
partitionCollectedInfo =
  flip foldr ([], []) \info (inconsistencies, dependencies) -> case info of
    CIInconsistency inconsistency -> (inconsistency:inconsistencies, dependencies)
    CIDependency metadataObject objectId schemaDependency ->
      let dependency = (metadataObject, objectId, schemaDependency)
      in (inconsistencies, dependency:dependencies)

recordInconsistency
  :: (ArrowWriter (Seq w) arr, AsInconsistentMetadata w) => (MetadataObject, Text) `arr` ()
recordInconsistency = first (arr (:[])) >>> recordInconsistencies

recordInconsistencies
  :: (ArrowWriter (Seq w) arr, AsInconsistentMetadata w) => ([MetadataObject], Text) `arr` ()
recordInconsistencies = proc (metadataObjects, reason) ->
  tellA -< Seq.fromList $ map (review _InconsistentMetadata . InconsistentObject reason) metadataObjects

recordDependencies
  :: (ArrowWriter (Seq CollectedInfo) arr)
  => (MetadataObject, SchemaObjId, [SchemaDependency]) `arr` ()
recordDependencies = proc (metadataObject, schemaObjectId, dependencies) ->
  tellA -< Seq.fromList $ map (CIDependency metadataObject schemaObjectId) dependencies

withRecordInconsistency
  :: (ArrowChoice arr, ArrowWriter (Seq w) arr, AsInconsistentMetadata w)
  => ErrorA QErr arr (e, s) a
  -> arr (e, (MetadataObject, s)) (Maybe a)
withRecordInconsistency f = proc (e, (metadataObject, s)) -> do
  result <- runErrorA f -< (e, s)
  case result of
    Left err -> do
      recordInconsistency -< (metadataObject, qeError err)
      returnA -< Nothing
    Right v -> returnA -< Just v
{-# INLINABLE withRecordInconsistency #-}

-- ----------------------------------------------------------------------------
-- operations for triggering a schema cache rebuild

class (CacheRM m) => CacheRWM m where
  buildSchemaCacheWithOptions
    :: BuildReason
    -> CacheInvalidations
    -> MetadataModifier
    -> m ()

  setPreResolvedSource
    :: SourceName
    -> ResolvedSource
    -> m ()

data BuildReason
  -- | The build was triggered by an update this instance made to the metadata,
  -- so information in Postgres that needs to be kept in sync with
  -- the metadata (i.e. table event triggers) should be updated.
  = CatalogUpdate
  -- | The build was triggered by a notification that some other currently-running Hasura instance
  -- updated the metadata. Since that instance already updated event triggers, this build should be
  -- read-only.
  | CatalogSync
  deriving (Eq)

type ResolvedSources = HashMap SourceName ResolvedSource

data BuildContext
  = BuildContext
    { _bcReason          :: !BuildReason
    -- ^ Reason to invoke the schame cache build
    , _bcResolvedSources :: !ResolvedSources
    -- ^ Sources are resolved in the @'run_sql' API before invoking the
    -- schema cache build
    } deriving (Eq)

getResolvedSourceFromBuildContext
  :: SourceName -> BuildContext -> Maybe ResolvedSource
getResolvedSourceFromBuildContext sourceName =
  M.lookup sourceName . _bcResolvedSources

data CacheInvalidations = CacheInvalidations
  { ciMetadata      :: !Bool
  -- ^ Force reloading of all database information, including information not technically stored in
  -- metadata (currently just enum values). Set by the @reload_metadata@ API.
  , ciRemoteSchemas :: !(HashSet RemoteSchemaName)
  -- ^ Force refetching of the given remote schemas, even if their definition has not changed. Set
  -- by the @reload_remote_schema@ API.
  , ciSources       :: !(HashSet SourceName)
  -- ^ Force re-establishing connections of the given data sources, even if their configuration has not changed. Set
  -- by the @pg_reload_source@ API.
  }
$(deriveJSON (aesonDrop 2 snakeCase) ''CacheInvalidations)

instance Semigroup CacheInvalidations where
  CacheInvalidations a1 b1 c1 <> CacheInvalidations a2 b2 c2 = CacheInvalidations (a1 || a2) (b1 <> b2) (c1 <> c2)
instance Monoid CacheInvalidations where
  mempty = CacheInvalidations False mempty mempty

instance (CacheRWM m) => CacheRWM (ReaderT r m) where
  buildSchemaCacheWithOptions a b c = lift $ buildSchemaCacheWithOptions a b c
  setPreResolvedSource a b          = lift $ setPreResolvedSource a b
instance (CacheRWM m) => CacheRWM (TraceT m) where
  buildSchemaCacheWithOptions a b c = lift $ buildSchemaCacheWithOptions a b c
  setPreResolvedSource a b          = lift $ setPreResolvedSource a b

buildSchemaCache :: (CacheRWM m) => MetadataModifier -> m ()
buildSchemaCache = buildSchemaCacheWithOptions CatalogUpdate mempty

-- | Rebuilds the schema cache. If an object with the given object id became newly inconsistent,
-- raises an error about it specifically. Otherwise, raises a generic metadata inconsistency error.
buildSchemaCacheFor :: (QErrM m, CacheRWM m) => MetadataObjId -> MetadataModifier ->  m ()
buildSchemaCacheFor objectId metadataModifier = do
  oldSchemaCache <- askSchemaCache
  buildSchemaCache metadataModifier
  newSchemaCache <- askSchemaCache

  let diffInconsistentObjects = M.difference `on` (groupInconsistentMetadataById . scInconsistentObjs)
      newInconsistentObjects = newSchemaCache `diffInconsistentObjects` oldSchemaCache

  for_ (M.lookup objectId newInconsistentObjects) $ \matchingObjects -> do
    let reasons = T.intercalate ", " $ map imReason $ toList matchingObjects
    throwError (err400 ConstraintViolation reasons) { qeInternal = Just $ toJSON matchingObjects }

  unless (null newInconsistentObjects) $
    throwError (err400 Unexpected "cannot continue due to new inconsistent metadata")
      { qeInternal = Just $ toJSON (nub . concatMap toList $ M.elems newInconsistentObjects) }

-- | Like 'buildSchemaCache', but fails if there is any inconsistent metadata.
buildSchemaCacheStrict :: (QErrM m, CacheRWM m) => MetadataModifier -> m ()
buildSchemaCacheStrict metadataModifier = do
  buildSchemaCache metadataModifier
  sc <- askSchemaCache
  let inconsObjs = scInconsistentObjs sc
  unless (null inconsObjs) $ do
    let err = err400 Unexpected "cannot continue due to inconsistent metadata"
    throwError err{ qeInternal = Just $ toJSON inconsObjs }

-- | Executes the given action, and if any new 'InconsistentMetadata's are added to the schema
-- cache as a result of its execution, raises an error.
withNewInconsistentObjsCheck :: (QErrM m, CacheRM m) => m a -> m a
withNewInconsistentObjsCheck action = do
  originalObjects <- scInconsistentObjs <$> askSchemaCache
  result <- action
  currentObjects <- scInconsistentObjs <$> askSchemaCache

  let diffInconsistentObjects = M.difference `on` groupInconsistentMetadataById
      newInconsistentObjects =
        nub $ concatMap toList $ M.elems (currentObjects `diffInconsistentObjects` originalObjects)
  unless (null newInconsistentObjects) $
    throwError (err500 Unexpected "cannot continue due to newly found inconsistent metadata")
      { qeInternal = Just $ toJSON newInconsistentObjects }

  pure result
