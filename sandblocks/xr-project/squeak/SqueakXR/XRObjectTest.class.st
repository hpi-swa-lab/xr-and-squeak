Class {
	#name : #XRObjectTest,
	#superclass : #TestCase,
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRObjectTest >> testCanHaveChildren [

	| child object |
	object := XRObject new.
	
	self assert: object children isEmpty.
	
	child := XRObject new.
	object addChild: child.
	self assert: (object children contains: child).
]
