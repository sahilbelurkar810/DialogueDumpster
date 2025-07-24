import React from "react";
import styles from "./ResultDisplay.module.css";

function ResultDisplay({ dialogue, isLoading, error, info }) {
  return (
    <div className={styles.displayContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Generating dialogue...</p>
          <p className={styles.infoText}>
            This might take 10-30 seconds on CPU.
          </p>
        </div>
      )}
      {error && <div className={styles.errorMessage}>{error}</div>}
      {dialogue && !isLoading && !error && (
        <textarea
          className={styles.textArea}
          value={dialogue}
          rows="10"
          readOnly
          disabled
        ></textarea>
      )}
      {info && !isLoading && !error && (
        <div className="info-message">{info}</div>
      )}
      {!dialogue && !isLoading && !error && (
        <div className={styles.placeholderText}>
          Your generated dialogue will appear here.
        </div>
      )}
    </div>
  );
}

export default ResultDisplay;
