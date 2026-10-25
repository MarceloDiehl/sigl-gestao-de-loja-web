# SIGL – Sistema Integrado de Gestão de Loja

Sistema web de gestão para a **Orion Record Store**, uma loja de discos, instrumentos e artigos de música: frente de caixa (PDV), histórico de vendas, catálogo e estoque, cadastro de clientes e funcionários e um **modo totem** para o cliente consultar preços sozinho.

![Início](docs/telas/02-inicio.jpg)

## Histórico do projeto

- **Outubro de 2025:** desenvolvido e finalizado como atividade do curso **Técnico em Desenvolvimento de Sistemas do SENAC/RS**.
- **Outubro de 2026:** revisitado com novas funcionalidades e melhorias: novo front-end, login com Spring Security e permissões por cargo, vendas transacionais no servidor, proteção de dados pessoais, banco versionado com Flyway e testes automatizados. A finalização contou com o auxílio de inteligência artificial, o **Claude** (Anthropic).

## Funcionalidades

- **Nova venda (PDV):** carrinho pelo código do produto, pagamento em dinheiro (com troco), crédito, débito ou PIX e CPF na nota. A venda inteira é registrada numa única transação no servidor.
- **Histórico de vendas:** cada venda com número, data e hora, vendedor, pagamento e itens; filtro pelo código de um produto e cancelamento (devolve os itens ao estoque).
- **Consultar produto e Estoque:** preço, quantidade, tipo e condição; cadastro, atualização e exclusão de produtos.
- **Comunidade:** clientes e funcionários, com os detalhes de cada pessoa.
- **Modo totem:** consulta de preço em tela cheia para o cliente; só é encerrado com a senha de quem ativou ou de um gerente.
- **Login e permissões por cargo:** cada cargo vê e acessa apenas o que usa no dia a dia.

| Login | Início |
|---|---|
| ![Login](docs/telas/01-login.jpg) | ![Início](docs/telas/02-inicio.jpg) |

| Nova venda | Histórico de vendas |
|---|---|
| ![Nova venda](docs/telas/03-nova-venda.jpg) | ![Histórico de vendas](docs/telas/04-historico.jpg) |

| Consultar produto | Estoque |
|---|---|
| ![Consultar produto](docs/telas/05-consultar-produto.jpg) | ![Estoque](docs/telas/06-estoque.jpg) |

| Comunidade | Modo totem |
|---|---|
| ![Comunidade](docs/telas/07-comunidade.jpg) | ![Modo totem](docs/telas/08-modo-totem.jpg) |

## Tecnologias

- **Back-end:** Java 17, Spring Boot 3.5 (Web, Data JPA, Validation, Security), Hibernate
- **Banco de dados:** MySQL 8, com o schema versionado pelo **Flyway**
- **Front-end:** Thymeleaf, Bootstrap 5, jQuery (telas carregadas por AJAX numa página única)
- **Testes:** JUnit 5, Mockito, MockMvc, Spring Security Test e **H2** em memória

## Decisões técnicas

- **Venda transacional no servidor.** O navegador envia só os códigos e quantidades. Preço, total, troco, data e baixa de estoque são definidos no servidor dentro de `@Transactional`: ou a venda inteira é gravada, ou nada. Os produtos são travados com `SELECT ... FOR UPDATE` (em ordem de código, para evitar deadlock), então dois caixas não vendem a mesma última unidade.
- **Venda com cabeçalho e itens.** Cada item guarda código, título e preço do momento da venda: mudar o preço depois não altera vendas registradas.
- **Segurança.** Login com Spring Security, senhas em **BCrypt**, proteção **CSRF** nos formulários e nas chamadas AJAX, e escape de todo texto vindo do banco antes de entrar no HTML (contra XSS). As senhas antigas, em MD5, são convertidas para BCrypt no primeiro login de cada pessoa, sem ninguém precisar trocá-las.
- **Permissões por cargo** concentradas em `RegrasDeAcesso` e aplicadas às URLs; as telas usam as mesmas regras só para esconder o que o cargo não pode usar.

  |                                   | Vendedor | Estoquista | Gerente |
  |-----------------------------------|:--------:|:----------:|:-------:|
  | Início, consultar produto, totem  | ✔ | ✔ | ✔ |
  | Estoque (ver)                     | ✔ | ✔ | ✔ |
  | Cadastrar, editar, excluir produto| – | ✔ | ✔ |
  | Nova venda e histórico            | ✔ | – | ✔ |
  | Cancelar venda                    | – | – | ✔ |
  | Clientes (ver e cadastrar)        | ✔ | – | ✔ |
  | Excluir cliente, funcionários     | – | – | ✔ |

- **Dados pessoais (LGPD, princípio da necessidade).** O servidor decide o que cada cargo recebe: o vendedor vê do cliente só nome, contato, cidade e o CPF mascarado (`***.982.247-**`), e busca clientes apenas pelo CPF completo, para que buscas por pedaços não revelem os dígitos ocultos. RG, nascimento, endereço e os dados de funcionários ficam com o gerente. O CPF da nota segue a mesma regra no histórico de vendas.
- **Exclusões e validações no servidor.** Funcionário com vendas registradas não é excluído (o histórico depende dele), e ninguém exclui o próprio cadastro. CPF repetido, quantidade negativa e valor zero são recusados pelo back-end, mesmo que a tela seja contornada. As recusas saem como `ProblemDetail` (RFC 9457), com o status certo (400, 404, 409) e, quando o problema é de um campo, um mapa `campos` que a tela usa para mostrar a mensagem embaixo do campo.
- **Banco versionado.** Toda mudança de schema é uma migração do Flyway em `src/main/resources/db/migration`, testada num banco vazio e numa cópia do banco existente antes de ser aplicada.
- **Tabelas de apoio vindas do banco.** Tipos de produto, condições, cargos, escolaridades, gêneros e formas de pagamento são servidos por `GET /api/apoio`, em vez de ficarem fixos no HTML.

## Como rodar

### Pré-requisitos

- Java 17 ou mais recente
- MySQL 8

O Maven não precisa estar instalado: o projeto usa o Maven Wrapper (`mvnw`).

### 1. Criar o banco

```sql
CREATE DATABASE sigl;
```

As tabelas são criadas pelo Flyway na primeira execução.

### 2. Configurar a conexão

Copie `.env.example` para `.env`, na raiz do projeto, e preencha com os dados do seu MySQL:

```properties
DB_URL=jdbc:mysql://localhost:3306/sigl
DB_USERNAME=root
DB_PASSWORD=sua-senha
```

O `.env` não vai para o Git. As mesmas variáveis também podem vir do ambiente (por exemplo, num servidor).

### 3. Subir o sistema com os dados de demonstração

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=demo
```

No Windows (PowerShell): `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=demo"`

Acesse http://localhost:8080. O perfil `demo` carrega produtos de todos os tipos, alguns clientes e uma conta de cada cargo:

| Cargo | E-mail | Senha |
|---|---|---|
| Gerente | `gerente@sigl.demo` | `gerente123` |
| Vendedor | `vendedor@sigl.demo` | `vendedor123` |
| Estoquista | `estoque@sigl.demo` | `estoque123` |

Os dados de demonstração ficam fora das migrações principais e só são carregados com esse perfil: **não use o perfil `demo` em produção**, porque as senhas acima são públicas.

Sem o perfil (`./mvnw spring-boot:run`), o sistema sobe apenas com as migrações.

## Testes

```bash
./mvnw test
```

Os testes não dependem do MySQL: o perfil `test` usa H2 em memória, criado pelas mesmas migrações do Flyway, e valida as entidades contra esse schema. Cobrem as regras de venda (total, estoque, troco, cancelamento e recusas sem gravação), a matriz de permissões rota a rota, o login com a conversão MD5 → BCrypt, CSRF, o modo totem e os dados de demonstração.

## Estrutura

```
src/main/java/com/sigl/sigl
├── controller     endpoints REST (/api/...) e telas (ViewController)
├── dto            formato das requisições e respostas da API
├── exception      tratamento de erros (ProblemDetail)
├── model          entidades JPA (model/apoio: tabelas de apoio)
├── repository     acesso ao banco (Spring Data JPA)
├── seguranca      Spring Security: login, senhas, permissões por cargo
└── service        regras de negócio (vendas, funcionários, tabelas de apoio)

src/main/resources
├── db/migration   migrações do Flyway (V1, V2, ...)
├── db/demo        dados de demonstração (perfil demo)
├── static         CSS, JavaScript e imagens
└── templates      telas Thymeleaf
```

## Próximos passos

- Paginação nas listas de estoque, histórico e comunidade
- Limite de tentativas de login
- Navegação com os botões Voltar e Atualizar do navegador
- `Dockerfile` e instruções de deploy com HTTPS

## Autor

Marcelo Diehl
