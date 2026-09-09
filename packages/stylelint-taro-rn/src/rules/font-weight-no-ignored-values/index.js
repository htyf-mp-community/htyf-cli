import stylelint from 'stylelint'

import { namespace } from '../../utils/index.js'

export const ruleName = namespace('font-weight-no-ignored-values')

export const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (weight) => `Unexpected font-weight "${weight}"`
})

const acceptedWeights = ['400', '700', 'normal', 'bold']

export default function (actual) {
  return function (root, result) {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual
    })

    if (!validOptions) {
      return
    }

    root.walkDecls(/^font-weight$/i, (decl) => {
      if (acceptedWeights.indexOf(decl.value) > -1) {
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
