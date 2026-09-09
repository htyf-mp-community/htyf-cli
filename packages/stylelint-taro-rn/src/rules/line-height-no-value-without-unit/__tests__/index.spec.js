import { messages, ruleName } from '../index.js'

testRule({
  ruleName,
  config: [true],

  accept: [
    {
      code: `
      .foo {
        line-height: 16px;
      }
      `,
      description: 'accepts line-height value with "px" unit'
    }, {
      code: `
      .foo {
        line-height: 16PX;
      }
      `,
      description: 'accepts line-height value with "PX" unit'
    }, {
      code: `
      .foo {
        line-height: 16vh;
      }
      `,
      description: 'accepts line-height value with "vh" unit'
    }, {
      code: `
      .foo {
        line-height: 16rem;
      }
      `,
      description: 'accepts line-height value with "rem" unit'
    }, {
      code: `
      .foo {
        line-height: 16.6px;
      }
      `,
      description: 'accepts line-height value with decimal value'
    }, {
      code: `
      .foo {
        line-height: -16px;
      }
      `,
      description: 'accepts line-height value with negative value'
    }, {
      code: `
      .foo {
        line-height: 1vh;
      }
      `,
      description: 'accepts line-height value with "vh" unit'
    }
  ],

  reject: [
    {
      code: `
      .foo {
        line-height: 1;
      }
      `,
      message: messages.rejected('1'),
      line: 3,
      column: 22
    }, {
      code: `
      .foo {
        line-height: -1;
      }
      `,
      message: messages.rejected('-1'),
      line: 3,
      column: 22
    }, {
      code: `
      .foo {
        line-height: 100%;
      }
      `,
      message: messages.rejected('100%'),
      line: 3,
      column: 22
    }, {
      code: `
      .foo {
        line-height: 100pt;
      }
      `,
      message: messages.rejected('100pt'),
      line: 3,
      column: 22
    }
  ]
})

testRule({
  ruleName,
  config: [true],
  accept: ['0', '.5px', '1e2px', '16REM', '1VW'].map(value => ({ code: `.foo { line-height: ${value}; }` })),
  reject: ['16pxjunk', '16px 20px', '1..2vh', '.vh'].map(value => ({
    code: `.foo { line-height: ${value}; }`,
    message: messages.rejected(value),
    line: 1,
    column: 21
  }))
})
