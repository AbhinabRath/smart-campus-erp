'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PaymentDialog from './PaymentDialog';
export default function AdminFeeView() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] =
  useState<any>(null);

const [ledgerLoading, setLedgerLoading] =
  useState(false);
  const [dialogOpen, setDialogOpen] =
  useState(false);

const [selectedSemester, setSelectedSemester] =
  useState<any>(null);
  useEffect(() => {
    loadStudents();
    }, []);
    async function loadStudentLedger(
  studentId: string
) {
  try {

    setLedgerLoading(true);

    const res =
      await api.get(
        `/fees/student/${studentId}`
      );

    setSelectedStudent(
      res.data.data
    );

  } catch (err) {

    console.error(err);

  } finally {

    setLedgerLoading(false);

  }
}
  

  async function loadStudents() {
    try {
      const res = await api.get('/fees/admin/list');

      setStudents(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  async function submitPayment(
  amount: number
) {

  try {

    await api.post(
      '/fees/payment',
      {
        studentId:
          selectedStudent.student.id,

        semester:
          selectedSemester.semester,

        amountPaid:
          amount,

        remarks:
          'Admin Payment'
      }
    );

    setDialogOpen(false);

    await loadStudentLedger(
      selectedStudent.student.id
    );

    await loadStudents();

  } catch (err) {

    console.error(err);

    alert('Payment failed');

  }
}

  if (loading) {
    return <div>Loading fee records...</div>;
  }
  if (selectedStudent) {
  return (
    <div>

      <button
        onClick={() =>
          setSelectedStudent(null)
        }
        className="
          mb-6
          px-4
          py-2
          border
          rounded
        "
      >
        ← Back To Students
      </button>

      <h1 className="text-2xl font-bold mb-4">
        Student Fee Ledger
      </h1>

      <div className="mb-6">

        <p>
          <strong>Name:</strong>
          {' '}
          {selectedStudent.student.user.name}
        </p>

        <p>
          <strong>Roll:</strong>
          {' '}
          {selectedStudent.student.rollNumber}
        </p>

        <p>
          <strong>Semester:</strong>
          {' '}
          {selectedStudent.student.semester}
        </p>

      </div>

      {selectedStudent.ledger.map(
        (sem: any) => (

          <div
  key={sem.semester}
  className={`
    rounded-lg
    p-4
    mb-6
    border-2

    ${
      sem.balance <= 0
        ? 'border-green-500 bg-green-500/10'
        : 'border-red-500 bg-red-500/10'
    }
  `}
>

            <h2 className="font-bold mb-4">
              Semester {sem.semester}
            </h2>

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
                  <td>Paid</td>
                  <td>-₹ {sem.paidAmount}</td>
                </tr>

                <tr className="font-bold">
                  <td>Balance</td>
                  <td>₹ {sem.balance}</td>
                </tr>

              </tbody>

            </table>

            {sem.balance > 0 && (
  <button
  onClick={() => {

    setSelectedSemester(sem);

    setDialogOpen(true);

  }}
  className="
    mt-4
    bg-blue-600
    text-white
    px-4
    py-2
    rounded
  "
>
  Add Payment
</button>
)}

          </div>

        )
      )}

      <PaymentDialog
  open={dialogOpen}
  semester={
    selectedSemester?.semester
  }
  maxAmount={
    selectedSemester?.balance
  }
  onClose={() =>
    setDialogOpen(false)
  }
  onSubmit={submitPayment}
/>

    </div>
  );
}

  return (
    <div>

      <h1 className="text-2xl font-bold mb-6">
        Fee Management
      </h1>

      <div className="overflow-auto">

        <table className="w-full border">

          <thead>
            <tr className="border-b">

              <th>Name</th>
              <th>Roll No</th>
              <th>Semester</th>

              <th>Total Fee</th>
              <th>Paid</th>
              <th>Balance</th>

              <th>Status</th>

            </tr>
          </thead>

          <tbody>

            {students.map((student) => (

              <tr
  key={student.id}
  onClick={() =>
    loadStudentLedger(student.id)
  }
  className="
    border-b
    cursor-pointer
    hover:bg-muted/40
  "
>
                <td>{student.name}</td>

                <td>
                  {student.rollNumber}
                </td>

                <td>
                  {student.semester}
                </td>

                <td>
                  ₹ {student.totalFee}
                </td>

                <td>
                  ₹ {student.paidAmount}
                </td>

                <td>
                  ₹ {student.balance}
                </td>

                <td>

                  <span
                    className={
                      student.status === 'GREEN'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {student.status}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>
    
      </div>
      {ledgerLoading && (

  <div className="mt-8">
    Loading Ledger...
  </div>

)}



    </div>
  );
}