import type { TableItem } from './types';

export function groupTablesByRequirementType(tables: TableItem[]): Map<string, TableItem[]> {
  const groupMap = new Map<string, TableItem[]>();
  for (const table of tables) {
    const groupName = table.requirementType
      ? requirementTypeLabels[table.requirementType] ?? table.requirementType
      : 'Standard';
    const list = groupMap.get(groupName) ?? [];
    list.push(table);
    groupMap.set(groupName, list);
  }
  return groupMap;
}

export function getSortedGroupNames(groupMap: Map<string, TableItem[]>): string[] {
  return Array.from(groupMap.keys()).sort((a, b) => {
    if (a === 'Standard') return -1;
    if (b === 'Standard') return 1;
    return a.localeCompare(b);
  });
}

export const requirementTypeLabels: Record<string, string> = {
  MINIMUM_SPEND: 'Minimum Spend',
  BOTTLE_REQUIREMENT: 'Bottle Requirement',
};
