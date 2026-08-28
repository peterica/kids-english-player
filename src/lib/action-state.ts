/** 폼 Server Action 공통 결과. "use server" 파일은 값 export 를 못 해 따로 둔다. */
export type ActionState = { error: string | null; message: string | null };

export const emptyActionState: ActionState = { error: null, message: null };
