'use strict'

// Wraps the JQuery interface of Foundation in order to seperate it from angular.

class Modals {

	constructor ($window, $timeout) {
		this.$ = $window.$
		this.$timeout = $timeout
		this.modals = {}
	}

	open (modal) {
		return this.initializeModal(modal).then(modal => {
			modal.open()
			return modal
		})
	}

	close (modal) {
		return this.initializeModal(modal).then(modal => {
			modal.close()
			return modal
		})
	}

	initializeModal (modal) {
		let self = this
		return new Promise((resolve, reject) => {
			if(modal instanceof Foundation.Reveal) {
				resolve(modal)
			} else {
				self.$timeout(() => {
					if(!self.modals.hasOwnProperty(modal)) {
						self.modals[modal] = new Foundation.Reveal(self.$(modal))
					}
					resolve(self.modals[modal])
				})
			}
		})
	}

}

Modals.$inject = ['$window', '$timeout']

export default Modals