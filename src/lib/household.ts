import { prisma } from "./db";
import { PROGRESS_STATUS } from "./constants";
import { getChildCatalog } from "./child-content";
import { getTodayStatsForChild, type TodayStats } from "./stats";

export type ChildSummary = {
  id: number;
  name: string;
  enabled: boolean;
  minLevel: number;
  maxLevel: number;
  preferredChannels: { id: number; name: string; colorKey: string }[];
  catalogSize: number;
  completedCount: number;
  percent: number;
  today: TodayStats;
  collectionCount: number;
};

/** 부모 Dashboard / 아이 관리 화면이 함께 쓰는 아이별 요약 */
export async function getChildSummaries(householdId: number): Promise<ChildSummary[]> {
  const children = await prisma.child.findMany({
    where: { householdId },
    orderBy: [{ enabled: "desc" }, { id: "asc" }],
  });

  return Promise.all(
    children.map(async (child) => {
      const catalog = await getChildCatalog(householdId, child.id);
      const [completedCount, today, collectionCount, preference] = await Promise.all([
        prisma.videoProgress.count({
          where: { childId: child.id, status: PROGRESS_STATUS.COMPLETED },
        }),
        getTodayStatsForChild(child.id),
        prisma.collectionVideo.count({
          where: { collection: { householdId, childId: child.id } },
        }),
        prisma.childPreference.findUnique({
          where: { childId: child.id },
          include: { preferredChannels: { include: { channel: true } } },
        }),
      ]);

      const catalogSize = catalog.items.length;
      return {
        id: child.id,
        name: child.name,
        enabled: child.enabled,
        minLevel: catalog.scope.minLevel,
        maxLevel: catalog.scope.maxLevel,
        preferredChannels:
          preference?.preferredChannels.map((row) => ({
            id: row.channel.id,
            name: row.channel.name,
            colorKey: row.channel.colorKey,
          })) ?? [],
        catalogSize,
        completedCount,
        percent:
          catalogSize === 0
            ? 0
            : Math.min(100, Math.floor((completedCount / catalogSize) * 100)),
        today,
        collectionCount,
      };
    }),
  );
}

export function avatarClass(index: number): string {
  return ["", "green", "orange"][index % 3];
}
