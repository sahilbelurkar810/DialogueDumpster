import React from "react";
import styles from "./ContextInput.module.css";

function ContextInput({ value, onChange }) {
  return (
    <div className={styles.inputGroup}>
      <label htmlFor="context">Game Context</label>
      <textarea
        id="context"
        className={styles.textArea}
        value={value}
        onChange={onChange}
        placeholder="e.g., On the battlefield, surrounded by silence, two enemies hesitate before striking."
        rows="5"
      ></textarea>
    </div>
  );
}

export default ContextInput;
