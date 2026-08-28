/** 폼 서버 액션의 공통 결과 형태. "use server" 파일은 값 export 를 할 수 없어 분리한다. */
export type ActionState = { error: string | null; message: string | null };

export const emptyActionState: ActionState = { error: null, message: null };
