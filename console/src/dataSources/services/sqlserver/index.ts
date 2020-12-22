import { DataSourcesAPI } from '../..';
import { TableColumn } from '../../types';

export const sqlserver: DataSourcesAPI = {
  getFunctionSchema: () => {
    return '';
  },
  getFunctionDefinitionSql: () => {
    return '';
  },
  getFunctionDefinition: () => {
    return '';
  },
  getSchemaFunctions: () => {
    return [];
  },
  findFunction: () => {
    return undefined;
  },
  deleteFunctionSql: undefined,
  getGroupedTableComputedFields: () => {
    throw new Error('not implemented');
  },
  isColumnAutoIncrement: () => {
    throw new Error('not implemented');
  },
  getTableSupportedQueries: () => {
    throw new Error('not implemented');
  },
  getColumnType: (col: TableColumn) => {
    return col.data_type;
  },
  arrayToPostgresArray: (...args: any) => {
    // TODO
    return args;
  },
  getAdditionalColumnsInfoQuerySql: undefined,
  parseColumnsInfoResult: (args: any) => args,
  getFetchTablesListQuery: () => {
    throw new Error('not implemented');
  },
  fetchColumnTypesQuery: 'select "[]"',
  fetchColumnCastsQuery: 'select "[]"',
  fetchColumnDefaultFunctions: () => 'select "[]"',
  isSQLFunction: () => false,
  getEstimateCountQuery: (schema: string, table: string) => {
    throw new Error('not implemented');
  },
  getStatementTimeoutSql: (seconds: number) => {
    throw new Error('not implemented');
  },
  isTimeoutError: () => false,
  getViewDefinitionSql: viewName => {
    throw new Error('not implemented');
  },
  cascadeSqlQuery: () => {
    throw new Error('not implemented');
  },
  schemaListSql: '',
  dependencyErrorCode: '',
  columnDataTypes: [],
  commonDataTypes: [],
  createSQLRegex: () => {
    throw new Error('not implemented');
  },
  // isTable,
  // displayTableName,
  // getCreateTableQueries,
  // isColTypeString,
  // getDropTableSql,
  // getCreateSchemaSql,
  // getDropSchemaSql,
  // getAlterForeignKeySql,
  // getCreateFKeySql,
  // getDropConstraintSql,
  // getRenameTableSql: (
  //   schemaName: string | undefined,
  //   oldName: string,
  //   newName: string
  // ) => `sp_rename "${schemaName}"."${oldName}", "${newName}"`,
  // getDropTriggerSql,
  // getCreateTriggerSql,
  // getDropSql,
  // getDropColumnSql,
  // getAddColumnSql,
  // getAddUniqueConstraintSql,
  // getDropNotNullSql,
  // getSetCommentSql,
  // getSetColumnDefaultSql,
  // getSetNotNullSql,
  // getAlterColumnTypeSql,
  // getDropColumnDefaultSql,
  // getRenameColumnQuery,
  // checkSchemaModification,
  // getCreateCheckConstraintSql,
  // getCreatePkSql,
  // frequentlyUsedColumns: [],
  // primaryKeysInfoSql,
  // uniqueKeysSql,
  // checkConstraintsSql: undefined,
  // getFKRelations,
  // getReferenceOption: (option: string) => option,
  // getEventInvocationInfoByIDSql: undefined,
  // getDatabaseInfo: '',
};
