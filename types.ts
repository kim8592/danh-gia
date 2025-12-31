
export enum ViewMode {
  SUBJECT = 'subject',
  COMPETENCY = 'competency',
  QUALITY = 'quality'
}

export enum Level {
  T = 'T', // Hoàn thành tốt
  H = 'H', // Hoàn thành
  C = 'C', // Cần cố gắng
  D = 'Đ'  // Đạt (dùng cho Năng lực/Phẩm chất)
}

export interface Student {
  id: string;
  name: string;
  createdAt: number;
}

export interface EvaluationData {
  level: string;
  note?: string;
  comment?: string;
}

export interface TeacherAdvice {
  teacherAdvice: string;
  studentAdvice: string;
}

export interface BaseItem {
  id: string;
  name: string;
  createdAt: number;
}

export type ModalType = 'year' | 'class' | 'month' | 'subject' | 'student';
