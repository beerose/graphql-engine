import React from 'react';
import styles from './SwitchButton.scss';

const SwitchButton = props => {
  const { children } = props;

  return (
    <label className={styles.switch}>
      <input type="checkbox" />
      <span className={styles.slider + ' ' + styles.round} />
      {children}
    </label>
  );
};

export default SwitchButton;
