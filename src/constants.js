// Work type classification options
export const WORK_TYPES = [
  {
    id: '46650',
    name: 'Associate well being',
    value: 'associate-wellbeing',
    description: "Work associated with engineer's well being",
  },
  {
    id: '48051',
    name: 'Future sustainability',
    value: 'future-sustainability',
    description:
      'Work associated with sustainability of the product, core functionality, and long-term health.',
  },
  {
    id: '46651',
    name: 'Incidents and support',
    value: 'incidents-support',
    description: 'Work associated for outages and problems',
  },
  {
    id: '46653',
    name: 'Quality / Stability / Reliability',
    value: 'quality-stability',
    description: 'Work associated with quality assurance, bug fixes, and stability.',
  },
  {
    id: '46652',
    name: 'Security and compliance',
    value: 'security-compliance',
    description: 'Work associated with making product secure and up to date',
  },
  {
    id: '46654',
    name: 'Product / Portfolio work',
    value: 'product-portfolio',
    description:
      'Work associated with product itself, including new features, enhancements, and improvements.',
  },
];

// Batch processing configuration
export const BATCH_SIZE = 100;

// Debug output directory
export const STATIC_DIR = 'static';

// Default file names
export const DEFAULT_ISSUES_FILE = `${STATIC_DIR}/issues.json`;
export const SUCCESS_ISSUES_FILE = `${STATIC_DIR}/success_issues.json`;
