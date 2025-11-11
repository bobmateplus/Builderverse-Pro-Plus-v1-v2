import { SupplierCategory, Checklist } from './types';

export const SUPPLIER_CATEGORIES: { value: SupplierCategory; label: string }[] = [
  { value: 'Materials', label: 'Materials' },
  { value: 'Subcontractor', label: 'Subcontractor' },
  { value: 'Plant Hire', label: 'Plant Hire' },
  { value: 'Other', label: 'Other' },
];

export const CHECKLIST_TEMPLATES: Checklist[] = [
  {
    id: 'work-at-height',
    title: 'Working at Height Checklist',
    description: 'Essential checks before and during any work conducted at height. To be completed by a competent person.',
    items: [
      { text: 'Has a risk assessment for working at height been completed?' },
      { text: 'Is the work properly planned and supervised?' },
      { 
        text: 'Is all equipment for working at height (e.g., scaffolding, ladders, MEWPs) suitable for the task, stable, and in good condition?',
        subItems: [
          'Scaffolding inspected by a competent person before use.',
          'Ladders are industrial grade, inspected, and used on firm, level ground.',
          'MEWP operators are trained and certified.'
        ]
      },
      { text: 'Are measures in place to prevent falls (e.g., guardrails, working platforms)?' },
      { text: 'If fall prevention is not possible, are measures in place to minimize the distance and consequences of a fall (e.g., safety nets, harnesses)?' },
      { text: 'Are workers trained and competent to work at height?' },
      { text: 'Are there procedures for emergency rescue?' },
      { text: 'Is there protection for people below (e.g., exclusion zones, toe boards)?' },
      { text: 'Are weather conditions (wind, rain, ice) suitable for the work?' },
    ],
  },
  {
    id: 'hot-works',
    title: 'Hot Works Permit Checklist',
    description: 'For any work involving naked flames or production of heat/sparks (e.g., welding, grinding, soldering).',
    items: [
      { text: 'Has a Hot Works Permit been issued and signed?' },
      { text: 'Is the area clear of combustible materials (e.g., wood, paper, flammable liquids) within an 11-meter radius?' },
      { text: 'Are floors swept clean of combustibles?' },
      { text: 'Are combustible floors, walls, or ceilings protected with fire-resistant blankets?' },
      { text: 'Are all openings or cracks in walls and floors covered to prevent spark travel?' },
      { text: 'Is appropriate fire-fighting equipment (e.g., correct type of fire extinguisher) immediately available and personnel trained in its use?' },
      { text: 'Is a fire watch assigned to monitor the area during and for at least 60 minutes after the work is complete?' },
      { text: 'Are smoke/fire detection systems in the area protected or isolated as necessary?' },
      { text: 'Is ventilation adequate to remove fumes?' },
    ],
  },
  {
    id: 'manual-handling',
    title: 'Manual Handling Checklist',
    description: 'Checklist to assess and control the risks associated with lifting, carrying, and moving loads.',
    items: [
      { text: 'Can the need for manual handling be avoided or automated (e.g., using a trolley, pallet truck, crane)?' },
      { 
        text: 'Has a TILE assessment been conducted?',
        subItems: [
          'Task: Does it involve twisting, stooping, excessive pushing/pulling?',
          'Individual: Is the person capable? Do they have any health issues?',
          'Load: Is it heavy, bulky, unstable, or difficult to grasp?',
          'Environment: Are there space constraints, uneven floors, or poor lighting?'
        ]
      },
      { text: 'Are workers trained in correct lifting techniques (e.g., bending knees, keeping back straight)?' },
      { text: 'Is the load broken down into smaller, lighter components where possible?' },
      { text: 'Is appropriate Personal Protective Equipment (PPE) provided and worn (e.g., safety boots, gloves)?' },
      { text: 'Are routes clear of obstructions?' },
      { text: 'Are there sufficient rest breaks for repetitive tasks?' },
    ],
  },
];