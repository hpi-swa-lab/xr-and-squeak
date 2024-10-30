Extension { #name : #JSObjectProxy }

{ #category : #'*SqueakXR-helpers' }
JSObjectProxy >> asVector [

	self assert: self constructor = Three Vector3
		description: 'Converting JS object to Vector is only implemented for THREE.Vector3'.
	^ Vector3
		x: self x
		y: self y
		z: self z
]
