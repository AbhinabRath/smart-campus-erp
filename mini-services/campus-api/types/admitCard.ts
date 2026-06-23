export interface AdmitCardData {
  studentName: string;
  rollNumber: string;
  department: string;
  semester: number;
  examType: string;
  avatar?: string | null;

  admitCardNo: string;

  subjects: {
    code: string;
    name: string;
  }[];
}