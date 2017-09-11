import React from 'react'
import './msField.css'
import {addSizeClasses, addErrorWarnClasses, getClassName, initClasses} from './ms'
import Loading from '../components/loading'
import propTypes from 'prop-types'
import MSChips from './msChips'
import MSFieldOptions from './msFieldOptions'
import isMobile from '../utils/isMobile'
import requestAnimationFrame from '../utils/requestAnimationFrame'
import getElementBBox from '../utils/getElementBBox'

// perfomance tune

const defClass = {'ms-field': 1}
const emptyArray = []

const onChangeFld = { type: 'text', value: "", name: "" }
const onChangeEvent = {
  target: onChangeFld, 
  currentTarget: onChangeFld, 
  stopPropagation: () => {}, 
  preventDefault: () => {}
}

const contHeight = 250
const fieldHeight = 35
const topK = 0.2

function getOptionsStyle(fieldTop) {
  if (isMobile()) {
    let windowsHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    let showOnTop = fieldTop / windowsHeight > topK
    if (showOnTop) {
      return {height: Math.min(fieldTop, contHeight), bottom: fieldHeight}
    }
  }
}

export default class MSField extends React.PureComponent {

  static defaultProps = {
    nameCol: 'name',
    idCol: 'id',
    groupCol: 'group',
    isMulti: false,
    preventFilter: false
  }

  static propTypes = {
    nameCol: propTypes.string,
    idCol: propTypes.string,
    groupCol: propTypes.string,

    style: propTypes.object,
    onClear: propTypes.func,
    
    label: propTypes.string,
    name: propTypes.string.isRequired,
    value: propTypes.oneOfType([propTypes.number, propTypes.string]).isRequired,
    valueId: propTypes.oneOfType([propTypes.array, propTypes.number, propTypes.string]),
    options: propTypes.arrayOf(propTypes.object),

    className: propTypes.string,
    error: propTypes.string,
    warning: propTypes.string,
    size: propTypes.string,

    isLoading: propTypes.bool,
    isMulti: propTypes.bool,
    //isFree,

    // should we hide dropicon
    hideDropIcon: propTypes.bool,
    preventFilter: propTypes.bool
  }

  constructor(props) {
    super(props)
    this.state = {
      open: false,
      filter: false,
      touched: false
    }
  }

  onFocus = () => {
    // we make timeout, so browser already scroll to that field, and keyboard opened without lag
    // user has time to input something, and we don't see lags
    //setTimeout(() => {
      this.setState({open: true, touched: true})
    //}, 300)
    window.addEventListener('scroll', this.windowScroll)
  }

  onBlur = () => {
    // otherwise, click will not be able to fire, and options will be hidden already
    setTimeout(() => {
      this.setState({open: false, filter: false})
    })
    window.addEventListener('scroll', this.windowScroll)
  }

  onChange = ev => {
    let {valueId, onChange, isMulti} = this.props

    if (this.state.filter === false)
      this.setState({filter: true})

    // on change
    if (onChange) {
      onChange.call(this, ev)
    }

    // deselect if selected
    if (!isMulti && valueId != null) {
      //setTimeout(() => {
      this.select(null, {skipOnChange: true})
      //})
    }
  }

  handleClear = () => {
    this.select(null)
  }

  handleRemove = id => {
    let { valueId } = this.props
    if ( valueId != null ) {
      valueId = valueId.filter(x => x !== id)
      if (valueId.length === 0) valueId = null
    }
    this.select(valueId, {setOnlySent: true})
  }

  handleSelect = id => {
    this.select(id)
  }

  select(newValueId, { setOnlySent, skipOnChange } = {}) {
    let { valueId, isMulti, onSelected, onChange, onClear, name } = this.props
    let sentValueId = newValueId

    if (newValueId != null) {
      if (isMulti) {
        // skip selected
        if (!setOnlySent) {
          // check if selected values already selected
          if (valueId && valueId.find(x => x === newValueId)) return
          // new chips list
          if (valueId == null)
            newValueId = [newValueId]
          else if (newValueId != null)
            newValueId = [...valueId, newValueId]
          else
            newValueId = null
        }
      }
    }

    if (onClear && newValueId == null) {
      onClear()
    }

    if (onSelected) {
      onSelected.call(this, newValueId, sentValueId, this)
    }

    // call onChange callback
    if (!skipOnChange && onChange) {
      let v = ''
      if (!isMulti && newValueId != null)
      {
        let opt = this.getOption(newValueId)
        v = opt[this.props.nameCol]
      }

      // call on change when value changed
      if (this.props.value !== v)
      {
        //setTimeout(() => {
          // i am doing an event
          onChangeFld.value = v
          onChangeFld.name = name
          onChange.call(this, onChangeEvent)
        //})
      }
    }
  }

  getOption(valueId) {
    let { options: opts, idCol } = this.props
    for (var i = 0; i < opts.length; i++) {
      let o = opts[i]
      if (o[idCol] === valueId) {
        return o
      }
    }
  }

  getSelectedOptions(valueId) {
    let { options, idCol, nameCol } = this.props

    if (valueId == null || valueId === '') return emptyArray

    if (!Array.isArray(valueId))
      valueId = [valueId]

    let chips = null;
    if (Array.isArray(options)) {
      chips = valueId.map(v => {
        let f = options.find(f => f[idCol] === v)
        return f ?
          { id: f[idCol], value: f[nameCol] } :
          { id: v, value: v }
      })
    } else {
      chips = valueId.map(v => ({id: v, value: v}))
    }
    return chips
  }

  setRef = el => {
    this.optionsDiv = el
  }
  setIRef = el => {
    this.input = el
  }

  componentDidUpdate() {
    this.updatePos()
  }

  windowScroll = () => {
    requestAnimationFrame(this.updatePos)
  }

  updatePos = () => {
    if (this.optionsDiv) {
      let st = getOptionsStyle(getElementBBox(this.input).top)
      if (st) {
        this.optionsDiv.style.bottom = st.bottom + 'px'
        this.optionsDiv.style.height = st.height + 'px'
      }
      else {
        this.optionsDiv.style.bottom = ''
        this.optionsDiv.style.height = ''
      }
    }
  }

  render() {
    let {
      label,
      name,
      value,
      valueId,
      type,
      style,
      options,

      className,
      error,
      warning,
      size,

      isLoading,
      isMulti,
      //isFree,

      // should we hide dropicon
      hideDropIcon,
      preventFilter,
      
      nameCol,
      idCol,
      groupCol
    } = this.props

    let {
      filter
    } = this.state

    let isEmpty = !value && !valueId

    // make classes
    const classes = initClasses(className, defClass)
    addSizeClasses(classes, size)
    addErrorWarnClasses(classes, error, warning)
    if (isEmpty && !hideDropIcon && options) {
      classes['ms-field--dd'] = 1
    }

    let chips = null
    if (valueId != null) {
      chips = this.getSelectedOptions(valueId)
    }

    // if single value dropdown, then select one
    if (chips && chips.length && !isMulti) {
      value = chips[0].value
      chips = null
    }

    // get label class
    let labelClass = initClasses(null, {'ms-label':1})
    if (isMulti === true)
    {
      // value selected
      if (valueId)
      {
        if (this.state.open) {
          labelClass['ms-label--hide'] = 1
          labelClass['ms-label--float'] = 1
        }
        else {
          labelClass['ms-label--float'] = 1
        }
      }
      // no value selected
      else
      {
        if (this.state.open) {

        }
        else {
          labelClass['ms-label--float'] = 1
        }
      }
    }
    else {
      if (!value && !this.state.open)
        labelClass['ms-label--float'] = 1
    }

    let inputProps = {
      onFocus: this.onFocus,
      onBlur: this.onBlur,
      onChange: this.onChange,
      name,
      value,
      type
    }

    let optionsAreVisible = Array.isArray(options) && options.length > 0 && this.state.touched

    return (
      <div className={getClassName(classes)} style={style}>
        {
          // error message
          (error || warning) &&
          <div className="ms__message">{error || warning}</div>
        }
        {
          // chips
          chips &&
          <MSChips options={chips} onRemove={this.handleRemove}/>
        }
        {
          // label
          label &&
          <label className={getClassName(labelClass)}>{label}</label>
        }
        {
          // field
          <input ref={this.setIRef} {...inputProps} />
        }
        {
          // clear button
          !isEmpty &&
          <div className="clear" onClick={this.handleClear}>×</div>
        }
        {
          // options
          optionsAreVisible &&
          <div className="ms-options_cont" ref={this.setRef} style={ { display: this.state.open ? '' : 'none' } }>
            <MSFieldOptions 
              options={ options } 
              filter={ (!preventFilter && filter) ? value : null }
              onSelect={ this.handleSelect }
              nameCol={nameCol}
              idCol={idCol}
              groupCol={groupCol}
              />
          </div>
        }
        {
          // loading spinner
          isLoading && <Loading />
        }
      </div>
    )
  }
}


