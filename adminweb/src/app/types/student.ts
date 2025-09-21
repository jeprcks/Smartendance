// export interface Student {
//   _id: string;
//   studentId: string;
//   fullName: string;
//   email: string;
//   phoneNumber: string;
//   age: number;
//   birthDate: string;
//   gradeLevel: 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6';
//   section: 'A' | 'B' | 'C' | 'D';
//   gender: 'Male' | 'Female' | 'Other';
//   photo?: string;
//   shift: 'Morning' | 'Afternoon';
//   // Address can be either a string or an object
//   address?: string | {
//     street?: string;
//     city?: string;
//     province?: string;
//     zipCode?: string;
//   };
//   // Parent information
//   parentName?: string;
//   parentContact?: string;
//   parentInfo?: {
//     name?: string;
//     contactNumber?: string;
//   };
//   // Emergency contact information
//   emergencyContact?: {
//     name?: string;
//     contactNumber?: string;
//     relationship?: string;
//   };
//   emergencyContactName?: string;
//   relationship?: string;
//   // QR Code information
//   qrCode?: {
//     data?: string;
//     image?: string;
//     generatedAt?: string;
//     isActive?: boolean;
//   };
//   createdAt: string;
//   updatedAt: string;
// }