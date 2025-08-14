// Work type classification options
export const WORK_TYPES = [
  {
    name: 'Associate well being',
    value: 'associate-wellbeing',
    description: "Work associated with engineer's well being",
  },
  {
    name: 'Future sustainability',
    value: 'future-sustainability',
    description:
      'Work associated with sustainability of the product, core functionality, and long-term health.',
  },
  {
    name: 'Incidents and support',
    value: 'incidents-support',
    description: 'Work associated for outages and problems',
  },
  {
    name: 'Quality / Stability / Reliability',
    value: 'quality-stability',
    description: 'Work associated with quality assurance, bug fixes, and stability.',
  },
  {
    name: 'Security and compliance',
    value: 'security-compliance',
    description: 'Work associated with making product secure and up to date',
  },
  {
    name: 'Product / Portfolio work',
    value: 'product-portfolio',
    description:
      'Work associated with product itself, including new features, enhancements, and improvements.',
  },
];

// Batch processing configuration
export const BATCH_SIZE = 100;

// Default file names
export const DEFAULT_ISSUES_FILE = 'issues.json';
