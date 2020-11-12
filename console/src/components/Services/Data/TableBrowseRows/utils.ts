import { Operators } from '../constants';

type TableSchema = {
  primary_key?: { columns: string[] };
  columns: Array<{ column_name: string }>;
};

type TableSchemaWithPK = {
  [P in keyof TableSchema]-?: TableSchema[P];
};

export const isTableWithPK = (
  tableSchema: TableSchema
): tableSchema is TableSchemaWithPK => {
  return (
    !!tableSchema.primary_key && tableSchema.primary_key.columns.length > 0
  );
};

export const compareRows = (
  row1: Record<string, any>,
  row2: Record<string, any>,
  tableSchema: TableSchema,
  isView: boolean
) => {
  let same = true;
  if (!isView && isTableWithPK(tableSchema)) {
    tableSchema.primary_key.columns.forEach(pk => {
      if (row1[pk] !== row2[pk]) {
        same = false;
      }
    });
    return same;
  }
  tableSchema.columns.forEach(k => {
    if (row1[k.column_name] !== row2[k.column_name]) {
      same = false;
    }
  });
  return same;
};

export const getDefaultValue = (possibleValue: unknown, opName: string) => {
  if (possibleValue) {
    if (Array.isArray(possibleValue)) return JSON.stringify(possibleValue);
    return possibleValue;
  }

  const operator = Operators.find(op => op.value === opName);
  return operator && operator.defaultValue ? operator.defaultValue : '';
};

export const getQueryFromUrl = (urlQuery: {
  filter: unknown;
  sort: unknown;
}) => {
  let urlFilters: string[] = [];
  if (typeof urlQuery.filter === 'string') {
    urlFilters = [urlQuery.filter];
  } else if (Array.isArray(urlQuery!.filter)) {
    urlFilters = urlQuery.filter;
  }
  const where = {
    $and: urlFilters.map(filter => {
      const parts = filter.split(';');
      const col = parts[0];
      const op = parts[1];
      const value = parts[2];
      return { [col]: { [op]: value } };
    }),
  };

  let urlSorts: string[] = [];
  if (typeof urlQuery.sort === 'string') {
    urlSorts = [urlQuery.sort];
  } else if (Array.isArray(urlQuery.sort)) {
    urlSorts = urlQuery.sort;
  }

  const order_by = urlSorts.map(sort => {
    const parts = sort.split(';');
    const column = parts[0];
    const type = parts[1];
    const nulls = 'last';
    return { column, type, nulls };
  });

  return { order_by, where };
};

export const isPostgresTimeoutError = (error: {
  code: string;
  internal?: { error?: { message?: string } };
  message?: { error?: string; internal?: { error?: { message?: string } } };
}) => {
  if (error.internal && error.internal.error) {
    return !!error.internal?.error?.message?.includes('statement timeout');
  }

  if (error.message && error.message.error === 'postgres query error') {
    if (error.message.internal) {
      return !!error.message.internal.error?.message?.includes(
        'statement timeout'
      );
    }
    return error.message.error.includes('statement timeout');
  }

  return false;
};
