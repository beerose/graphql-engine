import { DataSourcesAPI } from '../..';
import { TableColumn, Table } from '../../types';
import { Operations, QUERY_TYPES } from '../../common';

export const isTable = (table: Table) => {
  return (
    table.table_type === 'TABLE' ||
    table.table_type === 'VIEW' ||
    table.table_type === 'BASE TABLE'
  );
};

const columnDataTypes = {
  INTEGER: 'integer',
  BIGINT: 'bigint',
  GUID: 'guid',
  JSONDTYPE: 'nvarchar',
  DATETIMEOFFSET: 'timestamp with time zone',
  NUMERIC: 'numeric',
  DATE: 'date',
  TIME: 'time',
  TEXT: 'text',
};

const commonDataTypes = [
  {
    name: 'Integer',
    value: 'integer',
    description: 'signed four-byte integer',
  },
  {
    name: 'Text',
    value: 'text',
    description: 'variable-length character string',
  },
  {
    name: 'Numeric',
    value: 'numeric',
    description: 'exact numeric of selected precision',
  },
  {
    name: 'DATETIMEOFFSET',
    value: 'timestamptz',
    description: 'date and time, including time zone',
  },
  {
    name: 'Time',
    value: 'time',
    description: 'time of day (no time zone)',
  },
  {
    name: 'Date',
    value: 'date',
    description: 'calendar date (year, month, day)',
  },
  {
    name: 'GUID',
    value: 'guid',
    description: 'global unique identifier',
  },
  {
    name: 'Big Integer',
    value: 'bigint',
    description: 'signed eight-byte integer',
  },
];

const createSQLRegex = /create\s+(?:|or\s+replace)\s+(view|table|function)\s+(?:\s+if+\s+not\s+exists\s+)?((\"?\w+\"?)\.(\"?\w+\"?)|(\"?\w+\"?))/g;

export const getColumnType = (column: TableColumn) => {
  let columnType = column.data_type;
  return columnType;
};

export const isColTypeString = (colType: string) =>
  ['text', 'varchar', 'char', 'bpchar', 'name'].includes(colType);

export const getTableSupportedQueries = (table: Table) => {
  let supportedQueryTypes: Operations[];

  if (isTable(table)) {
    supportedQueryTypes = QUERY_TYPES;
  } else {
    // is View
    supportedQueryTypes = [];

    // Add insert/update permission if it is insertable/updatable as returned by pg
    if (table.view_info) {
      if (
        table.view_info.is_insertable_into === 'YES' ||
        table.view_info.is_trigger_insertable_into === 'YES'
      ) {
        supportedQueryTypes.push('insert');
      }

      supportedQueryTypes.push('select'); // to maintain order

      if (table.view_info.is_updatable === 'YES') {
        supportedQueryTypes.push('update');
        supportedQueryTypes.push('delete');
      } else {
        if (table.view_info.is_trigger_updatable === 'YES') {
          supportedQueryTypes.push('update');
        }

        if (table.view_info.is_trigger_deletable === 'YES') {
          supportedQueryTypes.push('delete');
        }
      }
    } else {
      supportedQueryTypes.push('select');
    }
  }

  return supportedQueryTypes;
};

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
  dependencyErrorCode: '',
  columnDataTypes: [],
  commonDataTypes: [],
  createSQLRegex,
  // displayTableName,
  // getCreateTableQueries,
  // isColTypeString,
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
