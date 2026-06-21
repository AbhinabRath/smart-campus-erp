import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function buildSubjectPerformanceChart(marks: any[]) {
  return marks.reduce((acc, m) => {
    const name = m.subject?.name || 'Unknown';

    const existing = acc.find(
      (a: any) => a.name === name
    );

    if (existing) {
      existing.total += m.marksObtained;
      existing.maxTotal += m.totalMarks;

      existing.percentage = Math.round(
        (existing.total / existing.maxTotal) * 100
      );
    } else {
      acc.push({
        name,
        percentage: Math.round(
          (m.marksObtained / m.totalMarks) * 100
        ),
        total: m.marksObtained,
        maxTotal: m.totalMarks,
      });
    }

    return acc;
  }, []);
}