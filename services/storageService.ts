
import { BaseItem, Student, EvaluationData } from "../types";

const STORAGE_KEYS = {
  YEARS: 'thkb_years',
  CLASSES: 'thkb_classes',
  MONTHS: 'thkb_months',
  SUBJECTS: 'thkb_subjects',
  STUDENTS: (yearId: string, classId: string) => `thkb_students_${yearId}_${classId}`,
  EVALUATIONS: (key: string) => `thkb_eval_${key}`
};

export const storage = {
  get: <T,>(key: string, fallback: T): T => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  },
  set: (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Years
  getYears: () => storage.get<BaseItem[]>(STORAGE_KEYS.YEARS, []),
  saveYears: (years: BaseItem[]) => storage.set(STORAGE_KEYS.YEARS, years),

  // Classes
  getClasses: () => storage.get<BaseItem[]>(STORAGE_KEYS.CLASSES, []),
  saveClasses: (classes: BaseItem[]) => storage.set(STORAGE_KEYS.CLASSES, classes),

  // Months
  getMonths: () => storage.get<BaseItem[]>(STORAGE_KEYS.MONTHS, []),
  saveMonths: (months: BaseItem[]) => storage.set(STORAGE_KEYS.MONTHS, months),

  // Subjects
  getSubjects: () => storage.get<BaseItem[]>(STORAGE_KEYS.SUBJECTS, []),
  saveSubjects: (subjects: BaseItem[]) => storage.set(STORAGE_KEYS.SUBJECTS, subjects),

  // Students
  getStudents: (yId: string, cId: string) => storage.get<Student[]>(STORAGE_KEYS.STUDENTS(yId, cId), []),
  saveStudents: (yId: string, cId: string, students: Student[]) => storage.set(STORAGE_KEYS.STUDENTS(yId, cId), students),

  // Evaluations
  getEvaluations: (evalKey: string) => storage.get<Record<string, EvaluationData>>(STORAGE_KEYS.EVALUATIONS(evalKey), {}),
  saveEvaluations: (evalKey: string, data: Record<string, EvaluationData>) => storage.set(STORAGE_KEYS.EVALUATIONS(evalKey), data)
};
