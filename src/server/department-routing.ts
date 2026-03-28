export interface DepartmentRouting {
  category: string;
  department: string;
}

const routingMap: Array<DepartmentRouting & {keywords: string[]}> = [
  {
    category: 'electricity',
    department: 'Electricity Board',
    keywords: ['electricity', 'power', 'light', 'transformer', 'billing', 'voltage'],
  },
  {
    category: 'water',
    department: 'Water Department',
    keywords: ['water', 'pipeline', 'tap', 'drainage', 'sewage', 'sewer'],
  },
  {
    category: 'roads',
    department: 'Municipal Corporation',
    keywords: ['road', 'roads', 'pothole', 'street', 'footpath', 'construction'],
  },
];

export function routeComplaint(text: string): DepartmentRouting {
  const normalized = text.toLowerCase();

  for (const entry of routingMap) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return {
        category: entry.category,
        department: entry.department,
      };
    }
  }

  return {
    category: 'general',
    department: 'Citizen Grievance Cell',
  };
}
