# AGENTS.md — Delta NoSQL Database

Este arquivo orienta agentes de IA e pessoas que trabalham neste repositório. Leia-o por completo antes de
alterar qualquer arquivo e confirme as instruções da tarefa no `TASK.md` local.

---

## 1. Visão geral do Projeto Delta

O Delta é um projeto acadêmico do Ensino Médio Técnico em Análise e Desenvolvimento de Sistemas. O produto é
uma plataforma IoT para monitoramento inteligente do consumo residencial de água: sensores instalados em
hidrômetros enviam pulsos, o sistema consolida o consumo, identifica anomalias e disponibiliza informações para
aplicações web e mobile.

A arquitetura de dados é multi-banco:

- PostgreSQL mantém dados cadastrais e transacionais;
- MongoDB mantém telemetria IoT de alto volume e dados específicos da aplicação;
- Redis e Neo4j aparecem na documentação de arquitetura como componentes planejados, mas não possuem código
  neste workspace.

Este repositório é um dos repositórios Git independentes da organização `delta-app-ofc`. Não inicialize Git na
pasta agregadora `Repositorios/` e não presuma a estrutura de outros repositórios que não estejam clonados.

## 2. Contexto deste repositório

O `delta-nosql-database` contém os scripts MongoDB responsáveis pela criação e configuração das coleções, dos
índices, das Custom Roles e dos dados de exemplo do Projeto Delta. As tecnologias efetivamente usadas aqui são
JavaScript executado pelo `mongosh` e recursos nativos do MongoDB, como `$jsonSchema`, índices TTL, índices
compostos e índices parciais.

Os scripts trabalham com dois bancos:

- `db_delta_telemetry`: `pulses_raw`, `consumption_summary` e `device_status`;
- `db_delta_app`: `user_preferences`, `alerts_history`, `chat_sessions` e `chat_feedback`.

As coleções usam validação de schema com `validationLevel: "moderate"`. `pulses_raw` possui retenção de sete
dias por meio do índice TTL `ttl_7days`; `consumption_summary` e as coleções da aplicação são permanentes na
modelagem atual. `chat_sessions` usa mensagens embutidas no padrão Bucket.

Este repositório não contém o backend, o frontend, o aplicativo mobile nem os agentes de IA. As referências de
`user_id` e `device_id` entre MongoDB e PostgreSQL são lógicas; a integridade entre os bancos não é imposta por
foreign keys do MongoDB.

## 3. Leitura obrigatória do `TASK.md`

Antes de executar qualquer tarefa:

1. Leia este `AGENTS.md` por completo.
2. Localize e leia integralmente o `TASK.md` na raiz deste repositório.
3. Confirme o estado atual dos arquivos e do Git antes de editar.
4. Restrinja as alterações ao escopo descrito no `TASK.md` e nas instruções do solicitante.

Se o `TASK.md` não existir, **não o crie** e não invente requisitos. Informe a ausência ao responsável e solicite
o escopo necessário antes de prosseguir.

## 4. Estrutura atual do repositório

```text
delta-nosql-database/
├── .github/
│   └── workflows/
│       └── trigger_actions.yml
├── collections/
│   ├── db_delta_app.md
│   └── db_delta_telemetry.md
├── scripts/
│   ├── delta-app/
│   │   ├── script-collections.js
│   │   ├── script-indexes.js
│   │   ├── script-roles.js
│   │   └── script-seed.js
│   └── delta-telemetry/
│       ├── script-collections.js
│       ├── script-indexes.js
│       ├── script-roles.js
│       └── script-seed.js
├── QUICK_START.md
└── README.md
```

Responsabilidades dos arquivos:

- `script-collections.js`: cria as coleções e seus validadores de schema;
- `script-indexes.js`: cria os índices usados para retenção, unicidade e consultas;
- `script-roles.js`: cria as Custom Roles de governança de acesso de cada banco;
- `script-seed.js`: insere dados de desenvolvimento para validação e não deve ser executado em produção;
- `collections/*.md`: documenta estrutura, ciclo de vida, índices e consultas esperadas das coleções;
- `trigger_actions.yml`: chama o workflow reutilizável da organização para as verificações de Pull Request.

Para configurar cada banco a partir do zero, preserve a ordem existente: coleções, índices e roles; execute o
seed somente quando a tarefa pedir dados de desenvolvimento. Leia o conteúdo real dos scripts antes de mudar
schemas, índices, permissões ou exemplos.

## 5. Regras de arquitetura e escopo

- Não invente coleções, campos, roles, integrações ou serviços.
- Não trate itens descritos como planejados na documentação como recursos já implementados.
- Mantenha separados os scripts de `delta-app` e `delta-telemetry`.
- Preserve os nomes de bancos, coleções, campos, índices e roles definidos nos arquivos atuais, salvo mudança
  explicitamente solicitada.
- Não inclua credenciais, connection strings reais ou segredos em scripts e documentos.
- Valide alterações de schema, índice ou seed contra os arquivos em `collections/` e atualize a documentação
  correspondente quando a tarefa exigir mudança de comportamento.
- Não modifique o workflow organizacional nem amplie a automação de CI sem solicitação explícita.

## 6. Padrão de branches e commits

Siga `delta-handbook/DEVOPS/convencoes-desenvolvimento.md`.

Branches usam o formato:

```text
<tipo>/<descricao-da-alteracao>
```

Tipos permitidos:

| Tipo | Uso |
| --- | --- |
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem nova funcionalidade |
| `docs` | Alteração de documentação |
| `test` | Criação ou manutenção de testes |
| `style` | Alteração de estilização |

Use descrição curta, clara, em minúsculas e separada por hífens, por exemplo `docs/agents-md`. Crie a branch no
próprio `delta-nosql-database`, sempre a partir da `main` atualizada, e nunca na raiz agregadora do workspace.

Os commits seguem Conventional Commits no formato `<tipo>: descrição`, usando os mesmos tipos permitidos. Não
misture mudanças sem relação no mesmo commit.

## 7. Padrão de documentação

Siga o padrão definido no `README.md` do `delta-handbook`:

- use Markdown (`.md`);
- comece com um título claro e apresente o objetivo do documento;
- registre contexto e justificativas para decisões técnicas;
- organize o conteúdo com seções e subseções descritivas;
- use listas, tabelas e blocos de código quando tornarem a informação mais verificável;
- inclua diagramas somente quando forem necessários para explicar relações ou fluxos;
- mantenha o histórico de atualizações relevantes quando aplicável;
- nomeie novos arquivos em minúsculas, com palavras separadas por hífens, como `modelo-colecoes.md`;
- confira se já existe documentação equivalente antes de criar outro arquivo;
- mantenha exemplos coerentes com os schemas e scripts executáveis atuais.

Em documentação técnica, diferencie explicitamente o que está implementado, o que é exemplo e o que está
planejado. Não apresente comportamento esperado como se tivesse sido validado sem uma verificação real.

## 8. Aviso de manutenção

A seção **Estrutura atual do repositório** deve ser revisada periodicamente nesta conversa e atualizada depois
de commits oficiais que adicionem, removam ou reorganizem arquivos. Antes de cada atualização, compare esta
descrição com a árvore real da `main`; o conteúdo deste arquivo não substitui a inspeção do estado atual.
