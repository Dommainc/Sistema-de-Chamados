// Arquivos anexados na versão simulada. O localStorage só comporta ~5 MB, então os arquivos
// ficam no IndexedDB do navegador (compartilhado entre abas). Sem IndexedDB (testes, navegador
// restrito), ficam só em memória até recarregar a página.

const BANCO = "central-chamados-simulado";
const LOJA = "arquivos";

const memoria = new Map<string, Blob>();
let conexao: Promise<IDBDatabase | null> | null = null;

function abrir(): Promise<IDBDatabase | null> {
  if (conexao) return conexao;
  conexao = new Promise((resolver) => {
    if (typeof indexedDB === "undefined") return resolver(null);
    try {
      const pedido = indexedDB.open(BANCO, 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => resolver(null);
    } catch {
      resolver(null);
    }
  });
  return conexao;
}

function executar<T>(
  modo: IDBTransactionMode,
  operacao: (loja: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return abrir().then(
    (banco) =>
      new Promise((resolver) => {
        if (!banco) return resolver(null);
        try {
          const pedido = operacao(banco.transaction(LOJA, modo).objectStore(LOJA));
          pedido.onsuccess = () => resolver(pedido.result);
          pedido.onerror = () => resolver(null);
        } catch {
          resolver(null);
        }
      }),
  );
}

export async function guardarArquivo(id: string, arquivo: Blob): Promise<void> {
  memoria.set(id, arquivo);
  await executar("readwrite", (loja) => loja.put(arquivo, id));
}

export async function lerArquivo(id: string): Promise<Blob | null> {
  const emMemoria = memoria.get(id);
  if (emMemoria) return emMemoria;
  const salvo = await executar<Blob>("readonly", (loja) => loja.get(id) as IDBRequest<Blob>);
  return salvo ?? null;
}

export async function apagarTodosOsArquivos(): Promise<void> {
  memoria.clear();
  await executar("readwrite", (loja) => loja.clear());
}
