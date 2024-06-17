Class {
	#name : #Three,
	#superclass : #Object,
	#category : #'SqueakXR-Core'
}

{ #category : #forwarding }
Three class >> doesNotUnderstand: aMessage [

^ aMessage selector first isUppercase
		ifTrue: [self getClass: aMessage selector]
		ifFalse: [self forward: aMessage]
]

{ #category : #forwarding }
Three class >> forward: aMessage [

	^ self threeInstance
		perform: aMessage selector
		withArguments: aMessage arguments
]

{ #category : #forwarding }
Three class >> getClass: aString [

	^ self threeInstance at: aString
]

{ #category : #'as yet unclassified' }
Three class >> threeInstance [

	^ JS THREE
]
