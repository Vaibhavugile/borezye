import React, { useState } from "react";
import { migrateProductNumbers } from "./migrateProductNumbers";

const ProductMigration = () => {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const handleMigration = async () => {
    try {
      setRunning(true);
      setMessage("Migration started... Check browser console.");

      await migrateProductNumbers();

      setMessage("✅ Migration completed successfully.");
    } catch (error) {
      console.error("Migration error:", error);
      setMessage(`❌ Migration failed: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Firestore Product Migration</h2>

      <p>
        This will convert:
        <br />
        deposit → number
        <br />
        extraRent → number
        <br />
        price → number
        <br />
        quantity → number
        <br />
        minimumRentalPeriod → number
      </p>

      <button
        onClick={handleMigration}
        disabled={running}
        style={{
          padding: "12px 24px",
          cursor: running ? "not-allowed" : "pointer",
        }}
      >
        {running ? "Migrating..." : "Run Migration"}
      </button>

      {message && (
        <p style={{ marginTop: "20px" }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default ProductMigration;