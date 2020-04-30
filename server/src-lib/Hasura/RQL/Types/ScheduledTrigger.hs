-- | These are types for Scheduled Trigger definition; see "Hasura.Eventing.ScheduledTrigger"
module Hasura.RQL.Types.ScheduledTrigger
  ( ScheduleType(..)
  , ScheduledTriggerName(..)
  , ScheduledEventId(..)
  , CreateScheduledTrigger(..)
  , CreateScheduledEvent(..)
  , STRetryConf(..)
  , FetchEventsScheduledTrigger(..)
  , formatTime'
  , defaultSTRetryConf
  ) where

import           Data.Aeson
import           Data.Aeson.Casing
import           Data.Aeson.TH
import           Data.Time.Clock
import           Data.Time.Clock.Units
import           Data.Time.Format.ISO8601
import           Hasura.Incremental
import           Hasura.RQL.Types.Common     (NonNegativeDiffTime(..))
import           Hasura.Prelude
import           Data.Int                    (Int64)
import           System.Cron.Types

import qualified Data.Aeson                    as J
import qualified Data.Text                     as T
import qualified Hasura.RQL.Types.EventTrigger as ET

data STRetryConf
  = STRetryConf
  { strcNumRetries           :: !Int
  , strcRetryIntervalSeconds :: !NonNegativeDiffTime
  , strcTimeoutSeconds       :: !NonNegativeDiffTime
  , strcToleranceSeconds     :: !NonNegativeDiffTime
  -- ^ The tolerance configuration is used to determine whether a scheduled
  --   event is not too old to process. The age of the scheduled event is the
  --   difference between the current timestamp and the scheduled event's
  --   timestamp, if the age is than the tolerance then the scheduled event
  --   is marked as dead.
  } deriving (Show, Eq, Generic)

instance NFData STRetryConf
instance Cacheable STRetryConf

instance FromJSON STRetryConf where
  parseJSON = withObject "STRetryConf" \o -> do
    numRetries' <- o .:? "num_retries" .!= 0
    retryInterval <-
      o .:? "retry_interval_seconds" .!= (NonNegativeDiffTime $ seconds 10)
    timeout <-
      o .:? "timeout_seconds" .!= (NonNegativeDiffTime $ seconds 60)
    tolerance <-
      o .:? "tolerance_seconds" .!= (NonNegativeDiffTime $ hours 6)
    if numRetries' < 0
    then fail "num_retries cannot be a negative value"
    else pure $ STRetryConf numRetries' retryInterval timeout tolerance

$(deriveToJSON (aesonDrop 4 snakeCase){omitNothingFields=True} ''STRetryConf)

defaultSTRetryConf :: STRetryConf
defaultSTRetryConf =
  STRetryConf
  { strcNumRetries = 0
  , strcRetryIntervalSeconds = NonNegativeDiffTime $ seconds 10
  , strcTimeoutSeconds = NonNegativeDiffTime $ seconds 60
  , strcToleranceSeconds = NonNegativeDiffTime $ hours 6
  }

data ScheduleType = Cron CronSchedule | AdHoc (Maybe UTCTime)
  deriving (Show, Eq, Generic)

instance NFData ScheduleType
instance Cacheable ScheduleType

instance FromJSON ScheduleType where
  parseJSON =
    withObject "ScheduleType" $ \o -> do
      type' <- o .: "type"
      case type' of
        String "cron"  -> Cron <$> o .: "value"
        String "adhoc" -> AdHoc <$> o .:? "value"
        _              -> fail "expected type to be cron or adhoc"

instance ToJSON ScheduleType where
  toJSON (Cron cs)         = object ["type" .= String "cron", "value" .= toJSON cs]
  toJSON (AdHoc (Just ts)) = object ["type" .= String "adhoc", "value" .= toJSON ts]
  toJSON (AdHoc Nothing)   = object ["type" .= String "adhoc"]

data CreateScheduledTrigger
  = CreateScheduledTrigger
  { stName              :: !ET.TriggerName
  , stWebhook           :: !ET.WebhookConf
  , stSchedule          :: !ScheduleType
  , stPayload           :: !(Maybe J.Value)
  , stRetryConf         :: !STRetryConf
  , stHeaders           :: ![ET.HeaderConf]
  , stIncludeInMetadata :: !Bool
  } deriving (Show, Eq, Generic)

instance NFData CreateScheduledTrigger
instance Cacheable CreateScheduledTrigger

instance FromJSON CreateScheduledTrigger where
  parseJSON =
    withObject "CreateScheduledTrigger" $ \o -> do
      stName <- o .: "name"
      stWebhook <- o .: "webhook"
      stPayload <- o .:? "payload"
      stSchedule <- o .: "schedule"
      stRetryConf <- o .:? "retry_conf" .!= defaultSTRetryConf
      stHeaders <- o .:? "headers" .!= []
      stIncludeInMetadata <-
          o .:? "include_in_metadata" .!= False
      pure CreateScheduledTrigger {..}

$(deriveToJSON (aesonDrop 2 snakeCase){omitNothingFields=True} ''CreateScheduledTrigger)

data CreateScheduledEvent
  = CreateScheduledEvent
  { steName      :: !ET.TriggerName
  , steTimestamp :: !UTCTime
  -- ^ The timestamp should be in the <ISO 8601 https://en.wikipedia.org/wiki/ISO_8601>
  -- format (which is what @aeson@ expects by default for 'UTCTime').
  , stePayload   :: !(Maybe J.Value)
  } deriving (Show, Eq, Generic)

$(deriveJSON (aesonDrop 3 snakeCase){omitNothingFields=True} ''CreateScheduledEvent)

newtype ScheduledTriggerName
  = ScheduledTriggerName { unName :: ET.TriggerName }
  deriving (Show, Eq)

$(deriveJSON (aesonDrop 2 snakeCase) ''ScheduledTriggerName)

newtype ScheduledEventId
  = ScheduledEventId{ unEventId:: ET.EventId}
  deriving (Show, Eq)

$(deriveJSON (aesonDrop 2 snakeCase) ''ScheduledEventId)

formatTime' :: UTCTime -> T.Text
formatTime'= T.pack . iso8601Show

data FetchEventsScheduledTrigger
  = FetchEventsScheduledTrigger
  { festName   :: !ET.TriggerName
  , festOffset :: !Int64
  , festLimit  :: !(Maybe Int64)
  } deriving (Show, Eq, Generic)

$(deriveToJSON (aesonDrop 4 snakeCase) ''FetchEventsScheduledTrigger)

instance FromJSON FetchEventsScheduledTrigger where
  parseJSON =
    withObject "FetchEventsScheduledTrigger" $ \o ->
      FetchEventsScheduledTrigger <$> o .: "name"
                                  <*> o .:? "offset" .!= 0
                                  <*> o .:? "limit" .!= Nothing
