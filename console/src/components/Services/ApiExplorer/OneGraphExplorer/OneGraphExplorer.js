import React from 'react';
import { push } from 'react-router-redux';

import {
  getIntrospectionQuery,
  buildClientSchema,
  parse as sdlParse,
} from 'graphql';
import GraphiQLExplorer from 'graphiql-explorer';

import {
  makeDefaultArg,
  getDefaultScalarArgValue,
  getExplorerWidth,
  setExplorerWidth,
  getExplorerIsOpen,
  setExplorerIsOpen,
} from './utils';
import { getGraphiQLQueryFromLocalStorage } from '../GraphiQLWrapper/utils';
import { getRemoteQueries } from '../Actions';
import { getHeadersAsJSON } from '../utils';
import deriveMutation from '../../../../shared/utils/deriveMutation';
import {
  getActionDefinitionSdl,
  getTypesSdl,
} from '../../../../shared/utils/sdlUtils';
import {
  setActionDefinition,
  setTypeDefinition,
} from '../../Actions/Add/reducer';
import { getActionsCreateRoute } from '../../../Common/utils/routesUtils';

import '../GraphiQLWrapper/GraphiQL.css';
import './OneGraphExplorer.css';

class OneGraphExplorer extends React.Component {
  state = {
    explorerOpen: getExplorerIsOpen(),
    explorerWidth: getExplorerWidth(),
    explorerClientX: null,
    schema: null,
    query: undefined,
    isResizing: false,
    loading: false,
    previousIntrospectionHeaders: [],
  };

  componentDidMount() {
    this.setPersistedQuery();
    this.introspect();
  }

  componentDidUpdate() {
    if (!this.props.headerFocus && !this.state.loading) {
      if (
        JSON.stringify(this.props.headers) !==
        JSON.stringify(this.state.previousIntrospectionHeaders)
      ) {
        this.introspect();
      }
    }
  }

  setPersistedQuery() {
    const { urlParams, numberOfTables } = this.props;

    const queryFile = urlParams ? urlParams.query_file : null;

    if (queryFile) {
      getRemoteQueries(queryFile, remoteQuery =>
        this.setState({ query: remoteQuery })
      );
    } else if (numberOfTables === 0) {
      const NO_TABLES_MESSAGE = `# Looks like you do not have any tables.
# Click on the "Data" tab on top to create tables
# Try out GraphQL queries here after you create tables
`;

      this.setState({ query: NO_TABLES_MESSAGE });
    } else {
      const localStorageQuery = getGraphiQLQueryFromLocalStorage();

      if (localStorageQuery) {
        if (localStorageQuery.includes('do not have')) {
          const FRESH_GRAPHQL_MSG = '# Try out GraphQL queries here\n';

          this.setState({ query: FRESH_GRAPHQL_MSG });
        } else {
          this.setState({ query: localStorageQuery });
        }
      }
    }
  }

  introspect() {
    const { endpoint, headersInitialised } = this.props;
    if (!headersInitialised) {
      return;
    }
    const headers = JSON.parse(JSON.stringify(this.props.headers));
    this.setState({ loading: true });
    fetch(endpoint, {
      method: 'POST',
      headers: getHeadersAsJSON(headers || []),
      body: JSON.stringify({
        query: getIntrospectionQuery(),
      }),
    })
      .then(response => response.json())
      .then(result => {
        console.log(buildClientSchema(result.data));
        this.setState({
          schema: buildClientSchema(result.data),
          loading: false,
          previousIntrospectionHeaders: headers,
        });
      })
      .catch(() => {
        this.setState({
          schema: null,
          loading: false,
          previousIntrospectionHeaders: headers,
        });
      });
  }

  onExplorerResize = e => {
    const { explorerClientX, explorerWidth } = this.state;

    if (explorerClientX === null) {
      this.setState({ explorerClientX: e.clientX });
    } else {
      const newExplorerWidth = explorerWidth + e.clientX - explorerClientX;

      setExplorerWidth(newExplorerWidth);

      this.setState({
        explorerWidth: newExplorerWidth,
        explorerClientX: e.clientX,
      });
    }
  };

  editQuery = query => {
    this.setState({ query });
  };

  handleToggle = () => {
    const newIsOpen = !this.state.explorerOpen;

    setExplorerIsOpen(newIsOpen);

    this.setState({ explorerOpen: newIsOpen });
  };

  handleExplorerResize = e => {
    e.preventDefault();
    document.addEventListener('mousemove', this.onExplorerResize);
    this.setState({
      isResizing: true,
    });
  };

  handleExplorerResizeStop = e => {
    e.preventDefault();
    document.removeEventListener('mousemove', this.onExplorerResize);
    this.setState({
      isResizing: false,
    });
  };

  render() {
    const {
      schema,
      explorerOpen,
      query,
      explorerWidth,
      isResizing,
    } = this.state;

    const { renderGraphiql, dispatch } = this.props;

    const explorer = (
      <GraphiQLExplorer
        schema={schema}
        query={query}
        onEdit={this.editQuery}
        explorerIsOpen={explorerOpen}
        onToggleExplorer={this.handleToggle}
        getDefaultScalarArgValue={getDefaultScalarArgValue}
        makeDefaultArg={makeDefaultArg}
        width={explorerWidth}
      />
    );

    let explorerSeparator;
    if (explorerOpen) {
      explorerSeparator = (
        <div
          className="explorerGraphiqlSeparator explorerCursorResize"
          onMouseDown={this.handleExplorerResize}
          onMouseUp={this.handleExplorerResizeStop}
        />
      );
    }

    const deriveActionFromMutation = () => {
      if (!schema) return;
      if (!query) return;
      let derivedMutationMetadata;
      try {
        console.log(query);
        derivedMutationMetadata = deriveMutation(query.trim(), schema);
      } catch (e) {
        console.error(e);
        return;
      }
      const { action, types } = derivedMutationMetadata;
      const actionsSdl = getActionDefinitionSdl(
        action.name,
        action.arguments,
        action.output_type
      );
      const typesSdl = getTypesSdl(types);
      dispatch(
        setActionDefinition(actionsSdl, null, null, sdlParse(actionsSdl))
      );
      dispatch(setTypeDefinition(typesSdl, null, null, sdlParse(typesSdl)));
      let persistedDerivedMutations = window.localStorage.getItem(
        'HASURA_CONSOLE_DERIVED_MUTATIONS'
      );
      if (!persistedDerivedMutations) {
        persistedDerivedMutations = {};
      } else {
        persistedDerivedMutations = JSON.parse(persistedDerivedMutations);
      }
      persistedDerivedMutations[action.name] = query;
      window.localStorage.setItem(
        'HASURA_CONSOLE_DERIVED_MUTATIONS',
        JSON.stringify(persistedDerivedMutations)
      );
      dispatch(push(getActionsCreateRoute(true)));
    };

    const graphiql = renderGraphiql({
      query: query,
      onEditQuery: this.editQuery,
      schema: schema,
      toggleExplorer: deriveActionFromMutation,
    });

    return (
      <div
        className={
          'graphiql-container' + (isResizing ? ' explorerCursorResize' : '')
        }
        onMouseUp={this.handleExplorerResizeStop}
      >
        <div className="gqlexplorer">
          {explorer}
          {explorerSeparator}
        </div>
        {graphiql}
      </div>
    );
  }
}

export default OneGraphExplorer;
