import React from "react";
import styles from "./InputField.module.css";

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  );
}

export default InputField;
