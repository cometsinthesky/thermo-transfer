# Thermo Transfer: Uma Simulação Interativa de Transferência de Calor

Simulador educacional em HTML, CSS e JavaScript para explorar **transferência de calor**, **equilíbrio térmico**, **variação de temperatura** e propriedades térmicas de diferentes materiais de forma visual, interativa e didática.

## [Acesse a simulação Thermo Transfer agora!](https://cometsinthesky.github.io/thermo-transfer/)

## Sobre o projeto

**Thermo Transfer** é uma simulação web voltada ao ensino de Ciências, Física e Química, com foco na compreensão de fenômenos relacionados à **troca de calor entre materiais**.

A proposta do projeto é permitir que estudantes e professores observem, em tempo real, como diferentes blocos e substâncias interagem termicamente, analisando variáveis como temperatura, material, tempo e comportamento do sistema até o equilíbrio térmico.

O simulador foi pensado para uso educacional em sala de aula, estudo autônomo, demonstrações em projetor, atividades investigativas e sequências didáticas com metodologias ativas.

## Objetivos pedagógicos

Este projeto pode ser utilizado para trabalhar conceitos como:

- calor e temperatura;
- condução e troca de energia térmica;
- equilíbrio térmico;
- capacidade térmica e calor específico;
- influência do material no processo de aquecimento e resfriamento;
- leitura de gráficos de temperatura em função do tempo;
- observação de mudanças físicas em contextos de aquecimento/resfriamento;
- interpretação de simulações como modelos científicos.

Também é um recurso interessante para discutir a diferença entre:

- **quantidade de calor** e **temperatura**;
- **material** e **comportamento térmico**;
- **modelo computacional** e **fenômeno real**.

## Aplicações educacionais sugeridas

Este projeto pode ser utilizado em:

- aulas de Ciências do Ensino Fundamental II;
- aulas de Física no Ensino Médio;
- introdução à termologia;
- revisão de calorimetria;
- práticas investigativas com simulações;
- atividades de laboratório virtual;
- feiras de ciências e mostras interativas;
- formação de professores e oficinas pedagógicas.

Também pode ser adaptado para contextos bilíngues ou materiais didáticos digitais.

## Público-alvo

Este recurso pode ser especialmente útil para:

- professores de Ciências e Física;
- estudantes do Ensino Fundamental II e Ensino Médio;
- licenciandos em Física, Química e Ciências Naturais;
- pesquisadores em ensino de ciências;
- desenvolvedores de objetos educacionais digitais.

## Principais recursos

O projeto foi estruturado como uma aplicação web leve e visual, com foco em interação direta. Entre os principais recursos do simulador, destacam-se:

- interface visual com blocos/materiais representados por ícones;
- seleção e comparação de diferentes materiais térmicos;
- atualização dinâmica do comportamento térmico ao longo do tempo;
- cronômetro visual para acompanhar a evolução da simulação;
- organização modular em JavaScript, facilitando manutenção e expansão;
- estilização própria em CSS para apresentação clara dos elementos da simulação;
- funcionamento direto no navegador, sem necessidade de instalação;
- potencial de uso em desktop, notebook e outros dispositivos compatíveis com navegador moderno.

Pela estrutura do projeto, os materiais visuais disponíveis incluem:

- alumínio;
- cobre;
- vidro;
- granito;
- gelo;
- ferro;
- areia;
- água;
- vapor d’água;
- madeira.

Esses elementos ajudam a tornar a experiência mais intuitiva, visual e próxima do contexto escolar.

## Possibilidades de uso em aula

Este simulador pode ser utilizado em diferentes formatos pedagógicos, por exemplo:

### 1. Aula expositiva dialogada
O professor projeta a simulação e conduz perguntas investigativas, como:

- Qual material aquece mais rapidamente?
- O que acontece quando dois corpos com temperaturas diferentes entram em contato?
- Em que momento o sistema parece atingir equilíbrio térmico?
- Como o gráfico ajuda a interpretar o fenômeno?

### 2. Investigação em grupos
Os estudantes podem manipular variáveis, observar resultados e registrar hipóteses, comparando o comportamento de diferentes materiais.

### 3. Atividade de interpretação de gráficos
A simulação pode servir como base para leitura de curvas, análise de tendências, comparação entre linhas e discussão sobre taxa de variação de temperatura.

### 4. Integração com Química e mudanças de estado
A depender da versão implementada do simulador, o recurso também pode apoiar discussões sobre fusão, vaporização, calor latente e transições de fase.

### 5. Avaliação formativa
O professor pode utilizar o simulador como ponto de partida para questões orais, relatórios curtos, produção de hipóteses ou resolução de problemas.

## Estrutura do projeto

A organização dos arquivos segue uma estrutura enxuta e modular:

```text
thermo-transfer/
├── index.html
├── src/
│   ├── js/
│   │   ├── functions.js
│   │   ├── materials.js
│   │   ├── runner.js
│   │   └── variables.js
│   └── styles/
│       └── main.css
└── image-icons/
    ├── clock.png
    ├── speed.png
    └── materials/
        ├── aluminum.png
        ├── copper.png
        ├── glass.png
        ├── granite.png
        ├── ice.png
        ├── iron.png
        ├── sand.png
        ├── water.png
        ├── watervapour.png
        └── wood.png
```

### Função de cada arquivo

#### `index.html`
Arquivo principal da aplicação. Contém a estrutura base da interface, áreas visuais da simulação, controles e integração com os arquivos de estilo e JavaScript.

#### `src/js/variables.js`
Centraliza variáveis globais, estados iniciais, parâmetros-base da simulação e referências compartilhadas entre os demais scripts.

#### `src/js/materials.js`
Define os materiais disponíveis no sistema, possivelmente com propriedades específicas para cada substância ou bloco térmico.

#### `src/js/functions.js`
Reúne funções auxiliares e centrais da lógica do simulador, como cálculos, atualizações visuais e comportamentos dinâmicos.

#### `src/js/runner.js`
Responsável por iniciar a aplicação e coordenar a execução da simulação em tempo real.

#### `src/styles/main.css`
Arquivo de estilização principal, controlando layout, responsividade, aparência dos blocos, botões, painéis e demais elementos visuais.

#### `image-icons/`
Pasta com ícones e recursos gráficos usados na interface, incluindo materiais e indicadores visuais relacionados ao tempo e velocidade.

---

## Autoria

Desenvolvido por **Lucas Ferreira (UnB/IF/PPGEduC)**.
