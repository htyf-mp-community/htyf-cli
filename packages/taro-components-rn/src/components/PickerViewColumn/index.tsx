
import * as React from 'react'

import View from '../View'

export default class _PickerViewColumn extends React.Component {
  static defaultProps = {
    mode: 'selector',
  }

  render (): React.ReactNode {
    return (
      <View {...this.props} />
    )
  }
}
