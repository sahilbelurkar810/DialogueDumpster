import React from "react";
import styles from "./DialogueLengthSelector.module.css";

function DialogueLengthSelector({ value, onChange }) {
  return (
    <div className={styles.selectGroup}>
      <label htmlFor="dialogue-length">Dialogue Length</label>
      <select
        id="dialogue-length"
        className={styles.select}
        value={value}
        onChange={onChange}
      >
        <option value="Short">Short (2-5 exchanges)</option>
        <option value="Medium">Medium (6-10 exchanges)</option>
        <option value="Long">Long (11-20+ exchanges)</option>
      </select>
    </div>
  );
}

export default DialogueLengthSelector;
