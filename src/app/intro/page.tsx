import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Content Library",
    description:
      "서비스가 검증된 영어 콘텐츠를 Channel과 Level, Category로 정리해 제공합니다.",
  },
  {
    title: "My Collection",
    description:
      "부모는 필요한 영상을 우리 집 Collection으로 가져오고, 빼거나 순서를 바꿉니다. YouTube 주소로 직접 추가할 수도 있습니다.",
  },
  {
    title: "아이의 선택",
    description:
      "아이는 허용된 Level과 Channel 안에서 추천 영상을 보거나 직접 원하는 영상을 고릅니다.",
  },
  {
    title: "기록과 Auto Play",
    description:
      "이어보기·완료율·시청시간이 자동으로 남고, 계속 틀어놓기로 영어를 흘려들을 수 있습니다.",
  },
];

export default async function IntroPage() {
  const session = await getSessionUser();

  return (
    <main className="page">
      <div className="intro">
        <div className="intro-hero">
          <span className="tag blue">KIDS ENGLISH PLAYER V2</span>
          <h1>
            아이에게 맞는 영어 콘텐츠를
            <br />
            쉽게 고르고, 자유롭게 보게 합니다.
          </h1>
          <p>
            부모는 검증된 Content Library에서 Level과 Channel을 선택하고, 아이는 추천 영상과
            원하는 영상을 자유롭게 탐색합니다. 시청 기록과 진행률은 자동으로 관리됩니다.
          </p>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {session ? (
              <>
                <Link href="/admin" className="btn primary">
                  부모 화면으로
                </Link>
                <Link href="/kids" className="btn">
                  아이 화면으로
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup" className="btn primary">
                  회원가입
                </Link>
                <Link href="/login" className="btn">
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="intro-flow">
          {STEPS.map((step, index) => (
            <div className="intro-step" key={step.title}>
              <b>{index + 1}</b>
              <strong>{step.title}</strong>
              <p className="muted small">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="section-title">
            <h2>부모와 아이의 역할</h2>
          </div>
          <div className="grid equal2">
            <div className="stat">
              <span className="label">부모</span>
              <strong style={{ fontSize: 20 }}>고르고, 정하고, 확인합니다</strong>
              <p className="muted small" style={{ marginBottom: 0 }}>
                아이별 허용 Level과 선호 Channel을 정하고, Collection으로 볼 수 있는 영상을
                조정합니다. Dashboard에서 오늘 학습 시간과 최근 시청을 확인합니다.
              </p>
            </div>
            <div className="stat">
              <span className="label">아이</span>
              <strong style={{ fontSize: 20 }}>보고 싶은 영상을 직접 고릅니다</strong>
              <p className="muted small" style={{ marginBottom: 0 }}>
                이어보기와 오늘 추천으로 바로 시작하거나, Level·Channel을 눌러 원하는 영상을
                찾습니다. 고르기 어려우면 계속 틀어놓기를 씁니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
