export async function parseApiResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    const data = await res.json();
    if (!res.ok) {
      const message =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error: unknown }).error)
          : res.statusText;
      throw new Error(message || 'リクエストに失敗しました');
    }
    return data as T;
  }

  const text = await res.text();
  if (!res.ok) {
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error(
        'サーバーからHTMLが返されました。ログイン状態または .env.local の設定を確認してください。'
      );
    }
    throw new Error(text || res.statusText || 'リクエストに失敗しました');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('サーバー応答の形式が不正です');
  }
}
