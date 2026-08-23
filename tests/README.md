# Guia didático dos testes MongoDB

Este guia explica como a suíte protege os schemas MongoDB do Projeto Delta. O objetivo é ajudar estudantes a entender o que cada teste faz, por que ele existe e como alterá-lo com segurança.

## Atenção antes de executar

Os testes trabalham com nomes fixos de bancos e usam `dropDatabase()` para limpar o ambiente:

- `db_delta_app`;
- `db_delta_telemetry`;
- bancos temporários iniciados por `delta_compat_app_` e `delta_compat_telemetry_`.

Use somente um MongoDB local e descartável. Nunca configure `MONGODB_URI` com uma URI do Atlas, de produção ou de qualquer ambiente que contenha dados importantes. Apagar o banco faz parte do funcionamento normal da suíte.

## Objetivo das verificações

A suíte responde a duas perguntas:

1. O schema atual aceita documentos válidos e rejeita documentos inválidos pelo motivo certo?
2. O schema candidato continua aceitando os documentos legados que o sistema já utilizava?

O lint é uma etapa adicional. Ele procura problemas de sintaxe e de código nos scripts e testes, mas não prova o comportamento do MongoDB.

## Mapa dos arquivos

```text
tests/
├── README.md
├── helpers/
│   ├── run-mongosh.js
│   └── mongo-client.js
├── fixtures/
│   ├── delta-app/legacy/*.json
│   └── delta-telemetry/legacy/*.json
├── delta-app/
│   ├── schema-validation.test.js
│   └── backward-compatibility.test.js
└── delta-telemetry/
    ├── schema-validation.test.js
    └── backward-compatibility.test.js
```

- `schema-validation.test.js` verifica validators e índices do banco correspondente.
- `backward-compatibility.test.js` verifica se documentos legados continuam compatíveis.
- `fixtures/**/legacy/*.json` guarda um exemplo do formato legado de cada coleção.
- `run-mongosh.js` executa os scripts reais de collections e índices.
- `mongo-client.js` abre e fecha a conexão usada nas asserções dos testes.

### Ordem sugerida de leitura

Para estudar sem tentar entender tudo de uma vez:

1. comece por `helpers/mongo-client.js`, que apenas abre e fecha a conexão;
2. leia `helpers/run-mongosh.js`, que executa um arquivo pelo shell do MongoDB;
3. abra uma fixture em `fixtures/` para conhecer um documento legado;
4. estude primeiro um `schema-validation.test.js`;
5. deixe `backward-compatibility.test.js` por último, pois ele reúne `collMod`, fixtures e validação `moderate`.

## `mongosh` e driver MongoDB não são a mesma coisa

Os arquivos em `scripts/` foram escritos para o `mongosh`. Eles usam identificadores como `use`, `db` e `print`, que são fornecidos pelo shell do MongoDB e não existem em um módulo Node comum.

Por isso, `run-mongosh.js` inicia um subprocesso equivalente a:

```text
mongosh <uri> <caminho-do-script>
```

Assim, os testes executam os mesmos scripts usados na configuração real do banco. Eles não copiam nem reimplementam o validator.

O driver oficial `mongodb`, por outro lado, é uma biblioteca Node. Depois que o `mongosh` aplica os scripts, o Jest usa o driver para inserir documentos, atualizar registros, consultar índices, executar `collMod` e verificar os resultados.

Em resumo:

- `mongosh`: aplica o script real do repositório;
- driver `mongodb`: conversa com o banco durante as verificações;
- Jest: organiza os casos e decide se passaram ou falharam.

## JSON, EJSON e BSON

JSON comum representa texto, booleanos, números, arrays, objetos e `null`. O MongoDB armazena BSON, que também distingue tipos como `ObjectId`, data, inteiro de 32 bits, inteiro longo e `double`.

EJSON, ou Extended JSON, é uma forma de escrever esses tipos BSON em um arquivo de texto JSON. As fixtures usam, por exemplo:

```json
{
  "_id": { "$oid": "66c72b2f9b1d8b2bad72a001" },
  "user_id": { "$numberInt": "212" },
  "sent_at": { "$date": "2026-07-17T17:10:00Z" },
  "consumption_liters": { "$numberDouble": "14.0" },
  "ms_since_boot": { "$numberLong": "3452210" }
}
```

Essa distinção é importante. O tipo BSON produzido para um número JavaScript depende do valor e de como ele foi construído, enquanto o validator pode exigir exatamente `int`, `long` ou `double`. Nos testes, use `Int32`, `Double` e `Long` quando o schema exigir um tipo BSON específico.

## Por que verificar o erro 121

O MongoDB usa o código `121` para indicar que um documento falhou na validação do schema.

Um teste não deve aceitar apenas a frase “lançou algum erro”. Uma falha de conexão ou uma violação de índice único também lança erro, mas não prova que o validator funcionou. Por isso, os casos inválidos confirmam que o erro é um `MongoServerError` e que `error.code === 121`.

Alguns códigos ajudam no diagnóstico:

- `121`: documento rejeitado pelo validator;
- `11000`: valor duplicado em índice único, não é falha de schema;
- erros de conexão: o MongoDB não está acessível ou a URI está errada.

## `validationLevel: "moderate"`

As coleções do projeto usam validação moderada. Nesse modo:

- inserts novos são validados;
- updates em documentos que já atendem ao validator são validados;
- um documento antigo que já não atende ao validator pode continuar sem ser revalidado em alguns updates.

Essa última regra evita que uma mudança de schema bloqueie imediatamente todos os documentos antigos, mas também exige cuidado ao detectar compatibilidade. A suíte testa tanto um novo insert no formato legado quanto um update do documento já persistido.

## O que é `collMod`

`collMod` é um comando do MongoDB que modifica as opções de uma coleção existente. Nestes testes, ele aplica o validator candidato depois que o documento legado já foi inserido:

```javascript
await database.command({
  collMod: collectionName,
  validator: candidateValidator,
  validationLevel: "moderate",
  validationAction: "error"
});
```

Isso simula uma evolução de schema: primeiro existe o dado antigo; depois a nova regra entra em vigor.

## Fluxo da suíte de schema

O comando é:

```powershell
npm run test:schema
```

Para cada banco, a suíte segue estes passos:

1. Conecta ao MongoDB indicado por `MONGODB_URI`, ou usa `mongodb://127.0.0.1:27017`.
2. Apaga o banco fixo para começar sem resíduos.
3. Executa `script-collections.js` pelo `mongosh`.
4. Executa `script-indexes.js` pelo `mongosh`.
5. Insere um documento válido em cada coleção e confirma o sucesso.
6. Remove cada campo obrigatório, altera tipos ou usa valores fora de enums.
7. Confirma que cada documento inválido falha especificamente com código `121`.
8. Consulta os índices e confere nome, chaves e propriedades como `unique`, TTL e filtro parcial.
9. Apaga o banco e fecha a conexão.

O caso válido impede um falso positivo importante: um validator que rejeita tudo também rejeitaria os exemplos inválidos, mas estaria errado.

## Fluxo da suíte de compatibilidade

O comando é:

```powershell
npm run test:breaking-changes
```

Para cada banco, a suíte faz o seguinte:

1. Executa o `script-collections.js` atual e lê do MongoDB os validators candidatos.
2. Confirma que cada validator existe e usa `validationLevel: "moderate"`.
3. Lê a fixture EJSON legada da coleção.
4. Cria um banco temporário e uma coleção sem validator.
5. Insere o documento legado antes da mudança de schema.
6. Aplica o validator candidato com `collMod`.
7. Tenta inserir um novo documento no mesmo formato legado.
8. Tenta atualizar o documento legado que já estava armazenado.
9. Sem marcador de quebra intencional, exige que insert e update sejam aceitos.
10. Apaga o banco temporário, mesmo quando o teste falha.

Esse é o caso de controle “schema atual contra ele mesmo”. Se ele falhar sem uma mudança consciente, existe uma incompatibilidade ou uma fixture desatualizada.

## Como adicionar ou alterar casos

### Alterar uma coleção existente

1. Releia o `script-collections.js` do banco e a documentação em `collections/`.
2. Se documentação e script divergirem, pare e reporte a divergência. Não escolha um deles silenciosamente.
3. Atualize o gerador de documento válido em `schema-validation.test.js`, se necessário.
4. Adicione um caso por novo campo obrigatório.
5. Adicione casos para novos tipos e valores de enum.
6. Se um índice mudou, atualize ou acrescente sua verificação.
7. Avalie a fixture legada separadamente. Não a altere apenas para esconder uma quebra.
8. Execute lint, schema e compatibilidade.

Todo caso inválido deve continuar verificando o código `121`. Use valores únicos nos casos válidos para não confundir schema com erro `11000`.

### Adicionar uma coleção

1. Adicione a coleção aos scripts e à documentação do banco.
2. Crie os casos válidos e inválidos na suíte de schema.
3. Adicione a verificação dos índices esperados.
4. Crie `tests/fixtures/<db>/legacy/<collection>.json` em EJSON.
5. Adicione a coleção a `COLLECTION_CASES` em `backward-compatibility.test.js`, incluindo um update simples que realmente modifique um campo.
6. Rode as três verificações antes de enviar o Pull Request.

## Como registrar uma quebra intencional

Uma quebra intencional precisa de uma decisão consciente e de revisão técnica. Ela não deve ser usada apenas para deixar o pipeline verde.

Mantenha a fixture legada original e crie:

```text
tests/fixtures/<db>/legacy/quebra-esperada/<mesmo-nome>.json
```

O arquivo usa este envelope:

```json
{
  "reason": "O campo X passou a ser obrigatório após a migração aprovada.",
  "document": {
    "_id": { "$oid": "66c72b2f9b1d8b2bad72a001" },
    "user_id": { "$numberInt": "212" },
    "dark_mode_enabled": false
  }
}
```

Regras:

- o arquivo deve ter o mesmo nome da fixture base;
- `reason` deve ser texto não vazio e explicar a decisão;
- `document` deve ser a fixture completa em EJSON que demonstra a quebra;
- o Pull Request deve explicar a migração e ser revisado pela equipe;
- ao menos o novo insert ou o update precisa falhar com validação `121`; caso contrário, o marcador também falha.

Por causa do modo `moderate`, é possível que o insert seja rejeitado e o update do documento antigo não seja. A implementação aceita esse cenário somente quando existe o marcador explícito.

## Comandos locais

Na raiz do repositório:

```powershell
docker run --name delta-mongodb-tests --detach --publish 27017:27017 mongo:latest
mongosh "mongodb://127.0.0.1:27017" --quiet --eval "db.adminCommand({ ping: 1 })"
npm ci
npm run lint
npm run test:schema
npm run test:breaking-changes
docker rm --force delta-mongodb-tests
```

Para usar outra porta ou outro container descartável no PowerShell:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27018"
```

## Erros comuns

### `spawn mongosh ENOENT`

O Node não encontrou o executável `mongosh`. Instale o MongoDB Shell e confirme que ele está no `PATH`:

```powershell
mongosh --version
```

### Conexão recusada ou timeout

O container pode estar parado, iniciando ou publicado em outra porta. Verifique:

```powershell
docker ps --filter "name=delta-mongodb-tests"
mongosh "mongodb://127.0.0.1:27017" --quiet --eval "db.adminCommand({ ping: 1 })"
```

### Nome do container já está em uso

Remova o container anterior e suba um novo:

```powershell
docker rm --force delta-mongodb-tests
```

### O documento “válido” falhou com código 121

Compare o documento com o validator real. Confira campos obrigatórios, enums e tipos BSON. Um `number` JavaScript pode não ser o `int` exigido pelo schema.

### O documento inválido falhou com código 11000

O valor repetiu uma chave única. Torne o identificador único; código `11000` não comprova validação de schema.

### Jest não encerra

Confira se o `MongoClient` é fechado em `afterAll` e se todo banco temporário é removido em `finally`. Também procure subprocessos `mongosh` que não terminaram.

### Fixture EJSON não pode ser lida

Valide a sintaxe JSON e os marcadores como `$oid`, `$date`, `$numberInt`, `$numberLong` e `$numberDouble`. As fixtures são lidas em modo EJSON estrito.

## O que esta suíte não testa

- execução contra o MongoDB Atlas real;
- autenticação, usuários ou Custom Roles de `script-roles.js`;
- execução funcional de `script-seed.js`;
- backend, frontend, aplicativo móvel ou dispositivos IoT;
- desempenho, carga, concorrência ou capacidade do cluster;
- migração automática de documentos antigos;
- todos os formatos históricos possíveis, apenas os representados pelas fixtures;
- Redis e Neo4j, que não fazem parte deste repositório.

Os testes reduzem o risco de erro no schema e nos índices, mas não substituem revisão técnica, plano de migração nem testes de integração do sistema completo.
