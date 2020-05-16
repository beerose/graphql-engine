import React from 'react';
import ClearAdminSecret from './ClearAdminSecret';
import { connect } from 'react-redux';

const Logout = props => {
  const styles = require('../Settings.scss');

  return (
    <div
      className={`${styles.clear_fix} ${styles.padd_left} ${styles.padd_top} ${styles.metadata_wrapper} container-fluid`}
    >
      <div className={styles.subHeader}>
        <h2 className={`${styles.heading_text} ${styles.remove_pad_bottom}`}>
          Logout (clear admin-secret)
        </h2>
      </div>

      <div>
        <div key="access_key_reset_1" className={styles.intro_note}>
          <div className={styles.content_width}>
            The console caches the admin-secret (HASURA_GRAPHQL_ADMIN_SECRET) in
            the browser. You can clear this cache to force a prompt for the
            admin-secret when the console is accessed next using this browser.
          </div>
        </div>

        <div key="access_key_reset_2">
          <ClearAdminSecret {...props} />
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = state => {
  return {
    ...state.main,
    metadata: state.metadata,
    dataHeaders: { ...state.tables.dataHeaders },
  };
};

const ConnectedLogout = connect(mapStateToProps)(Logout);
export default ConnectedLogout;
