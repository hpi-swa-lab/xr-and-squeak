Class {
	#name : #XRWorldTest,
	#superclass : #XRTestCase,
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRWorldTest >> testAddTopLevelObjects [

	| world object |
	world := XRWorld new.
	object := XRObject new.
	world add: object.
	self assert: (world topLevelXrObjects includes: object).
]
