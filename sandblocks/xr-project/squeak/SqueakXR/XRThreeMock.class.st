Class {
	#name : #XRThreeMock,
	#superclass : #Object,
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #nil }
XRThreeMock >> at: aString [

	aString = #Object3D ifTrue: [^ XRThreeObject3DMock].
	self error: 'Unhandled Three access: ', aString
]
