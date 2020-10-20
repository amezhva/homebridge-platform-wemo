/* jshint -W014, -W033, esversion: 9 */
/* eslint-disable new-cap */
'use strict'
module.exports = class deviceMakerSwitch {
  constructor (platform, accessory, device) {
    this.log = platform.log
    this.config = platform.config
    this.debug = this.config.debug || false
    this.device = device
    this.client = accessory.client
    this.Service = platform.api.hap.Service
    this.Characteristic = platform.api.hap.Characteristic
    if (accessory.getService(this.Service.GarageDoorOpener)) {
      accessory.removeService(accessory.getService(this.Service.GarageDoorOpener))
    }
    const service = accessory.getService(this.Service.Switch) || accessory.addService(this.Service.Switch)
    service
      .getCharacteristic(this.Characteristic.On)
      .on('set', (value, callback) => this.setSwitchState(value, callback))
    accessory.client.getAttributes(
      (err, attributes) => {
        if (err) {
          this.log.warn('[%s] wemoClient.getAttributes error - %s.', this.accessory.displayName, err)
          return
        }
        this.device.attributes = attributes
        const contactSensor = this.accessory.getService(this.Service.ContactSensor)
        if (attributes.SensorPresent === 1) {
          if (!contactSensor) this.accessory.addService(this.Service.ContactSensor)
          this.updateSensorState(attributes.Sensor)
        } else {
          if (contactSensor) this.accessory.removeService(contactSensor)
          delete this.sensorPresent
        }
        this.updateSwitchState(attributes.Switch)
      }
    )
    accessory.client.on('error', err => this.log.warn('[%s] reported error - %s.', accessory.displayName, err.code))
    accessory.client.on('attributeList', (name, value, prevalue, timestamp) => {
      switch (name) {
        case 'Switch':
          this.updateSwitchState(value)
          break
        case 'Sensor':
          this.updateSensorState(value, true)
          break
      }
    })
    this.accessory = accessory
  }

  setSwitchState (state, callback) {
    const value = state | 0
    const switchState = this.accessory.getService(this.Service.Switch).getCharacteristic(this.Characteristic.On).value
    if (switchState === value) {
      callback()
      return
    }
    this.client.setBinaryState(
      value,
      err => {
        if (err) {
          this.log.warn('[%s] setting state [%s] error - %s', this.accessory.displayName, value ? 'on' : 'off', err.code)
          callback(new Error(err))
        } else {
          if (this.debug) this.log('[%s] setting state to [%s].', this.accessory.displayName, value ? 'on' : 'off')
        }
      }
    )
    callback()
  }

  updateSensorState (state, wasTriggered) {
    state = state | 0
    const value = state === 1
    const service = this.accessory.getService(this.Service.ContactSensor)
    const sensorState = service.getCharacteristic(this.Characteristic.ContactSensorState).value
    if (sensorState !== value) {
      service.updateCharacteristic(
        this.Characteristic.ContactSensorState,
        value
          ? this.Characteristic.ContactSensorState.CONTACT_DETECTED
          : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
      )
      if (this.debug) this.log('[%s] updating sensor state [%s].', this.accessory.displayName, value ? 'detected' : 'not detected')
    }
  }

  updateSwitchState (state) {
    state = state | 0
    const value = state === 1
    const service = this.accessory.getService(this.Service.Switch)
    const switchState = service.getCharacteristic(this.Characteristic.On).value
    if (switchState !== value) {
      service.updateCharacteristic(this.Characteristic.On, value)
      if (this.debug) this.log('[%s] updating state [%s].', this.accessory.displayName, value ? 'on' : 'off')
    }
  }
}