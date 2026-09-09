import stylelint from 'stylelint'

import { namespace } from '../../utils/index.js'

export const ruleName = namespace('line-height-no-value-without-unit')

export const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (height) =>
    `Unexpected line-height "${height}", expect a value with units`
})

const lengthRe = /^(?:0|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px|rem|vh|vw|vmin|vmax))$/i

export default function (actual) {
  return function (root, result) {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual
    })

    if (!validOptions) {
      return
    }

    root.walkDecls(/^line-height$/i, (decl) => {
      if (lengthRe.test(decl.value)) {
        return
      }

      stylelint.utils.report({
        message: messages.rejected(decl.value),
        node: decl,
        result,
        ruleName,
        word: decl.value
      })
    })
  }
}
