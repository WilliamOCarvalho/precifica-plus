# Precifica+

**Preço certo. Mais lucro para o seu negócio.**

O Precifica+ é o MVP de uma aplicação SaaS para ajudar pequenos negócios, MEIs, vendedores e prestadores de serviço a formar preços de maneira objetiva. Ele considera custos unitários, impostos, taxas de pagamento, comissão e a margem líquida desejada.

## O que está disponível neste MVP

- Calculadora de preço para produtos, com estrutura inicial para serviços;
- Cálculo de preço recomendado e composição financeira da venda por canal;
- Canais editáveis: PIX, débito, crédito e marketplace;
- Comparação de preço necessário, taxa, lucro e margem entre canais;
- Simulação de um mesmo preço em todos os canais;
- Equivalência de preço para manter a margem de um canal de referência;
- Sugestões de arredondamento comercial com impacto em lucro e margem;
- Formatação brasileira de moeda e percentuais;
- Interface responsiva para desktop, tablet e celular;
- Validações de dados e de cenários matematicamente impossíveis.

As entradas são mantidas apenas na sessão do navegador. Não há autenticação nem persistência neste estágio.

## Stack

- Next.js, React e TypeScript (modo estrito);
- Tailwind CSS v4;
- Vitest para os testes unitários do domínio;
- ESLint e Prettier;
- Docker para desenvolvimento/execução sem instalação local do Node.js.

## Arquitetura

```text
src/
├── app/                    # Rotas e estilos globais do Next.js
├── domain/pricing/         # Regras de negócio puras, tipos e testes
├── features/pricing/       # Interface e estado da calculadora
└── lib/                    # Formatação e conversão pt-BR
```

O motor em `src/domain/pricing` não importa React nem Next.js. Por isso, pode ser reutilizado no futuro por uma API, app mobile ou outros canais. A camada de interface apenas converte a entrada do usuário e apresenta o resultado.

## Fórmula de precificação

O preço não é calculado por `custo × (1 + margem)`. Como taxas e margem incidem sobre o preço de venda, o motor utiliza:

```text
preço = custo_base / (1 - taxas - margem_desejada)
```

Onde:

- `custo_base` = produto + embalagem/materiais + outros custos variáveis + rateio de custo fixo;
- `taxas` = imposto da operação + comissão + taxa específica do canal, em formato decimal;
- `margem_desejada` é a margem líquida, também em formato decimal.

O cálculo é rejeitado quando taxas + margem são iguais ou superiores a 100%, pois não existe preço de venda válido nesse cenário.

## Canais de venda

Os canais são parte explícita do domínio. O imposto e a comissão permanecem como componentes da operação, enquanto a taxa do canal é isolada e editável em cada simulação.

Os valores iniciais são somente referências: PIX (0%), débito (1,5%), crédito (3,49%) e marketplace (16%). Eles não representam taxas oficiais, e podem ser alterados pelo usuário.

Além do preço recomendado por canal, o aplicativo oferece duas leituras complementares:

- **Mesmo preço em todos os canais:** mostra como lucro e margem mudam para uma venda idêntica;
- **Manter a mesma margem:** obtém a margem real de uma venda de referência e calcula o preço necessário nos demais canais para reproduzi-la.

As sugestões de arredondamento comercial são sempre derivadas do preço matemático e exibem seus impactos. O sistema não classifica uma sugestão como melhor.

### Precisão monetária

Valores monetários entram e saem do motor como **centavos inteiros**. O preço recomendado é arredondado ao centavo mais próximo; em seguida, cada taxa e o lucro são calculados a partir desse preço já arredondado. Isso preserva a conciliação da venda (`preço = custos + taxas + lucro`) e evita os problemas comuns de ponto flutuante em dinheiro. Percentuais permanecem como números decimais e seus valores monetários são arredondados a centavos.

## Como executar com Docker

Para executar a aplicação de produção:

```bash
docker compose up --build
```

Depois, acesse `http://localhost:3000`.

Para construir a imagem local e executar os comandos de qualidade no container:

```bash
docker build --tag precifica-plus:local .
docker run --rm --entrypoint npm precifica-plus:local run test
docker run --rm --entrypoint npm precifica-plus:local run lint
docker run --rm --entrypoint npm precifica-plus:local run typecheck
docker run --rm --entrypoint npm precifica-plus:local run build
```

O build da imagem executa `npm ci` a partir do `package-lock.json`; portanto, não é necessário instalar Node.js no Windows.

## Qualidade

Os testes unitários cobrem:

- cálculo normal, taxas e margem zeradas;
- PIX, débito, crédito e marketplace;
- comparação de canais com mesmo preço;
- equivalência para preservar margem;
- arredondamento comercial e monetário;
- simulação de preço manual e prejuízo;
- percentuais totais inválidos, valores negativos, `NaN` e `Infinity`.

## Roadmap inicial

1. Persistência em PostgreSQL para empresas, produtos, custos e histórico;
2. Autenticação e planos SaaS;
3. Regras completas para serviços: custo/hora, horas, materiais e deslocamento;
4. Simulações salvas, relatórios e recomendações de decisão.
