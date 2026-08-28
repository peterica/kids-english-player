import { requirePageSession } from "@/lib/guard";
import { listPlaylists, getPlaylistWithVideos } from "@/lib/playlists";

export const dynamic = "force-dynamic";

export default async function PlaylistOverviewPage() {
  await requirePageSession();
  const playlists = await listPlaylists();
  const detailed = await Promise.all(
    playlists.map((playlist) => getPlaylistWithVideos(playlist.id)),
  );

  return (
    <>
      <div className="topbar">
        <div>
          <h1>학습 과정</h1>
          <p>Level 1~4 커리큘럼과 영상 순서입니다. (읽기 전용)</p>
        </div>
        <div className="pill">{playlists.length}개 과정</div>
      </div>

      <div className="grid two">
        {detailed.map((playlist) =>
          playlist ? (
            <section className="card" key={playlist.id}>
              <div className="section-title">
                <h3>{playlist.title}</h3>
                <span className="label">{playlist.videos.length}편</span>
              </div>
              {playlist.description ? (
                <p className="hint" style={{ marginTop: 0 }}>
                  {playlist.description}
                </p>
              ) : null}
              <div className="list">
                {playlist.videos.map((item, index) => (
                  <div className="list-row" key={item.id}>
                    <div className="num">{index + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <strong>{item.video.title}</strong>
                      <div className="hint">
                        sequence {item.sequence} · {item.video.youtubeVideoId}
                        {item.video.enabled ? "" : " · 비활성"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null,
        )}
      </div>
    </>
  );
}
