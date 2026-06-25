'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function StudentFeeView() {
  const [feeData, setFeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFees();
  }, []);

  async function fetchFees() {
    try {
      const res = await api.get('/fees/my');

      setFeeData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  function paySemesterFee(
  semester: number,
  amount: number
) {
  alert(
    `Redirecting payment for Semester ${semester}\nAmount: ₹${amount}`
  );

  window.open(
    'https://onlinesbi.sbi.bank.in/sbicollect/',
    '_blank'
  );
}

  if (loading) {
    return <div>Loading fees...</div>;
  }

  if (!feeData) {
    return <div>No fee data found.</div>;
  }

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        My Fee Details
      </h1>

      <div className="grid grid-cols-4 gap-4">

        <div className="border rounded-lg p-4">
          <p>Total Fee</p>
          <h2>₹ {feeData.totalFee}</h2>
        </div>

        <div className="border rounded-lg p-4">
          <p>Paid</p>
          <h2>₹ {feeData.paidAmount}</h2>
        </div>

        <div className="border rounded-lg p-4">
          <p>Outstanding</p>
          <h2>₹ {feeData.outstanding}</h2>
        </div>

        <div className="border rounded-lg p-4">
          <p>Status</p>

          <h2
            className={
              feeData.status === 'GREEN'
                ? 'text-green-600'
                : 'text-red-600'
            }
          >
            {feeData.status}
          </h2>
        </div>

      </div>
<h2 className="text-xl font-bold mt-8">
  Fee Ledger
</h2>

<div className="space-y-6">
  {feeData.ledger?.map((sem: any) => (

    <div
  key={sem.semester}
  className={`
    rounded-lg
    p-4
    border-2
    mb-6

    ${
      sem.balance <= 0
        ? 'border-green-500 bg-green-500/10'
        : 'border-red-500 bg-red-500/10'
    }
  `}
>

      <h3 className="font-bold mb-4">
        Semester {sem.semester}
      </h3>

      <table className="w-full">

        <tbody>

          <tr>
            <td>Tuition Fee</td>
            <td>₹ {sem.tuitionFee}</td>
          </tr>

          <tr>
            <td>Hostel Fee</td>
            <td>₹ {sem.hostelFee}</td>
          </tr>

          <tr>
            <td>Exam Fee</td>
            <td>₹ {sem.examFee}</td>
          </tr>

          <tr>
            <td>Library Fee</td>
            <td>₹ {sem.libraryFee}</td>
          </tr>

          <tr>
            <td>Misc Fee</td>
            <td>₹ {sem.miscFee}</td>
          </tr>

          <tr className="text-green-600">
            <td>Payment Received</td>
            <td>
              -₹ {sem.paidAmount}
            </td>
          </tr>

          <tr className="font-bold">
            <td>Balance</td>
            <td>
              ₹ {sem.balance}
            </td>
          </tr>
          {sem.balance > 0 && (
  <tr>
    <td colSpan={2}>

      <button
        onClick={() =>
          paySemesterFee(
            sem.semester,
            sem.balance
          )
        }
        className="
          mt-4
          bg-blue-600
          text-white
          px-4
          py-2
          rounded
        "
      >
        Pay Now
      </button>

    </td>
  </tr>
)}

        </tbody>

      </table>
      
    </div>

  ))}
</div>

    </div>
  );
  
}