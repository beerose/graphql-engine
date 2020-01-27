import React from 'react';
import styles from './Button.scss';

const Button = props => {
  const { children, type, size } = props;

  let btnTypeStyle;
  switch (type) {
    case 'primary':
      btnTypeStyle = styles.primary;
      break;
    case 'secondary':
      btnTypeStyle = styles.secondary;
      break;
    case 'success':
      btnTypeStyle = styles.success;
      break;
    case 'danger':
      btnTypeStyle = styles.danger;
      break;
    case 'warning':
      btnTypeStyle = styles.warning;
      break;
    case 'info':
      btnTypeStyle = styles.info;
      break;
    default:
      btnTypeStyle = styles.primary;
      break;
  }

  let btnSizeStyle;
  switch (size) {
    case 'large':
      btnSizeStyle = styles.large;
      break;
    case 'small':
      btnSizeStyle = styles.small;
      break;
    default:
      btnSizeStyle = styles.large;
      break;
  }

  return (
    <button className={styles.button + ' ' + btnTypeStyle + ' ' + btnSizeStyle}>
      {children}
    </button>
  );
};

export default Button;
