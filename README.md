# Delta NoSQL Database

Repositório dos scripts de criação e configuração dos bancos MongoDB do Projeto Delta. Ele mantém os schemas, índices, dados de exemplo e roles dos bancos `db_delta_app` e `db_delta_telemetry`, além da suíte automatizada que valida essas definições antes do merge.

Para estudar como os testes funcionam e como criar novos casos, consulte o [guia didático da suíte](tests/README.md).

## Estrutura

- `collections/` — documentação das coleções de cada banco.
- `scripts/delta-app/` — collections, índices, roles e seed de `db_delta_app`.
- `scripts/delta-telemetry/` — collections, índices, roles e seed de `db_delta_telemetry`.
- `tests/delta-app/` — testes do schema e da compatibilidade retroativa do banco do aplicativo.
- `tests/delta-telemetry/` — testes do schema e da compatibilidade retroativa do banco de telemetria.
- `tests/fixtures/` — documentos legados em Extended JSON (EJSON), usados pelo detector de breaking changes.
- `tests/helpers/` — execução dos scripts reais pelo `mongosh` e conexão pelo driver oficial do MongoDB.
- `.github/workflows/ci.yml` — pipeline de lint, validação de schema e compatibilidade retroativa.
- `QUICK_START.md` — configuração e execução manual dos scripts MongoDB.

Os arquivos `script-collections.js` e `script-indexes.js` continuam sendo scripts do `mongosh`. Os testes os executam como subprocessos, da mesma forma que no uso real, em vez de reimplementar ou importar sua lógica.

## Suíte automatizada

O projeto usa Jest com módulos ESM (`"type": "module"`). Os scripts npm já inicializam o Jest com o suporte necessário a ESM e executam os testes em série, evitando que duas suítes alterem o mesmo banco temporário ao mesmo tempo.

### Pré-requisitos

- Node.js 18.18 ou superior e npm.
- Docker Desktop ou Docker Engine em execução.
- `mongosh` instalado na máquina e disponível no `PATH`.
- Porta local `27017` livre, se for usado o comando de container abaixo.

O binário `mongosh` precisa existir no host porque os helpers de teste o iniciam diretamente. O shell incluído na imagem Docker não substitui essa instalação local.

### Preparar o ambiente local

Na raiz deste repositório, suba uma instância descartável e sem autenticação do MongoDB:

```powershell
docker run --name delta-mongodb-tests --detach --publish 27017:27017 mongo:latest
```

Confirme que o banco está pronto:

```powershell
mongosh "mongodb://127.0.0.1:27017" --quiet --eval "db.adminCommand({ ping: 1 })"
```

Instale exatamente as versões registradas no lockfile:

```powershell
npm ci
```

Por padrão, os testes acessam `mongodb://127.0.0.1:27017`. Para usar outra instância descartável, defina `MONGODB_URI` antes dos comandos. Exemplo no PowerShell:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27018"
```

Não use uma URI do Atlas ou um banco com dados reais: as suítes removem e recriam os bancos `db_delta_app` e `db_delta_telemetry` durante a execução.

### Executar as verificações

```powershell
npm run lint
npm run test:schema
npm run test:breaking-changes
```

- `npm run lint` analisa `scripts/**/*.js` e `tests/**/*.js`. A configuração reconhece tanto o ambiente Node/Jest quanto os globais legítimos do `mongosh`.
- `npm run test:schema` aplica os scripts reais de collections e índices nos dois bancos. Em seguida, confirma os índices, aceita documentos válidos e exige erro MongoDB `121` para documentos que violam campos obrigatórios, tipos ou enums.
- `npm run test:breaking-changes` insere cada fixture legada, aplica o validator candidato com `collMod` e verifica insert e update no formato anterior. O caso de controle compara o schema atual com suas próprias fixtures para impedir falsos positivos.

### Registrar uma quebra intencional

Uma nova restrição pode rejeitar um documento que era aceito pela versão anterior. Quando essa quebra for uma decisão consciente da equipe, mantenha a fixture legada original e adicione uma autorização explícita em:

```text
tests/fixtures/<db>/legacy/quebra-esperada/<mesmo-nome>.json
```

Por exemplo, para autorizar uma quebra referente a `tests/fixtures/delta-app/legacy/user_preferences.json`, crie `tests/fixtures/delta-app/legacy/quebra-esperada/user_preferences.json` com este envelope:

```json
{
  "reason": "A nova versão exige o campo X após a migração aprovada pela equipe.",
  "document": {
    "_id": { "$oid": "66c72b2f9b1d8b2bad72a001" },
    "user_id": { "$numberInt": "212" },
    "dark_mode_enabled": false
  }
}
```

`document` deve conter a fixture legada completa em EJSON, e `reason` deve explicar a decisão com texto não vazio. O mesmo nome associa a autorização à fixture base. Esse arquivo não transforma automaticamente qualquer falha em sucesso: ele registra uma exceção específica, que deve acompanhar a mudança de schema e passar por revisão técnica no Pull Request.

### Encerrar o ambiente

Depois dos testes, encerre e remova o container e seus dados descartáveis:

```powershell
docker rm --force delta-mongodb-tests
```
