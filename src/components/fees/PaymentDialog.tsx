'use client';

import { useState } from 'react';

export default function PaymentDialog({
  open,
  onClose,
  onSubmit,
  semester,
  maxAmount
}: any) {

  const [amount, setAmount] =
    useState('');

  if (!open) return null;

  return (
    <div className="
      fixed inset-0
      bg-black/50
      flex items-center
      justify-center
      z-50
    ">

      <div className="
        bg-card
        p-6
        rounded-lg
        w-[400px]
      ">

        <h2 className="text-xl font-bold mb-4">
          Add Payment
        </h2>

        <p className="mb-2">
          Semester {semester}
        </p>

        <p className="mb-4 text-sm text-muted-foreground">
          Outstanding:
          ₹ {maxAmount}
        </p>

        <input
          type="number"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          placeholder="Enter Amount"
          className="
            w-full
            border
            rounded
            p-2
            mb-4
          "
        />

        <div className="flex gap-2">

          <button
            onClick={onClose}
            className="
              border
              px-4
              py-2
              rounded
            "
          >
            Cancel
          </button>

          <button
            onClick={() =>
              onSubmit(Number(amount))
            }
            className="
              bg-blue-600
              text-white
              px-4
              py-2
              rounded
            "
          >
            Save
          </button>

        </div>

      </div>

    </div>
  );
}