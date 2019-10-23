import React from 'react';
import styles from './Styles.scss';

const ArgumentInput = ({ argument, setArgument, allTypes }) => {
  const { name, type, description } = argument;

  const nameOnChange = e => {
    setArgument({
      ...argument,
      name: e.target.value,
    });
  };
  const typeOnChange = e => {
    setArgument({
      ...argument,
      type: e.target.value,
    });
  };
  const descriptionOnChange = e => {
    setArgument({
      ...argument,
      description: e.target.value,
    });
  };

  const noTypes = allTypes.length === 0;

  return (
    <div className={`${styles.display_flex}`}>
      <input
        type="text"
        value={name}
        onChange={nameOnChange}
        placeholder="argument name"
        className={`form-control ${styles.inputWidth} ${
          styles.add_mar_right_small
        }`}
      />
      <select
        className={`form-control ${styles.inputWidthMid} ${
          styles.add_mar_right_small
        }`}
        value={type || ''}
        disabled={noTypes}
        onChange={typeOnChange}
      >
        {!type && (
          <option key="" value="">
            {' '}
            -- type --{' '}
          </option>
        )}
        {allTypes.map(t => {
          return (
            <option key={t} value={t}>
              {t}
            </option>
          );
        })}
      </select>
      <input
        type="text"
        value={description}
        onChange={descriptionOnChange}
        placeholder="description"
        className={`form-control ${styles.inputWidth} ${
          styles.add_mar_right_small
        }`}
      />
    </div>
  );
};

export default ArgumentInput;
