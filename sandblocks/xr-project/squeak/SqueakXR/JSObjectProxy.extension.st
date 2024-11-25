Extension { #name : #JSObjectProxy }

{ #category : #'*SqueakXR-helpers' }
JSObjectProxy >> asVector [

	self assert: (JS Object is: (JS Object getPrototypeOf: self) theSameAs: Three Vector3 prototype)
		description: 'Converting JS object to Vector is only implemented for THREE.Vector3'.
	^ Vector3
		x: self x
		y: self y
		z: self z
]
